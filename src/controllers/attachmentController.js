// ============================================================================
// Attachment Controller
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { query, queryOne, queryMany, beginTransaction, commit, rollback } = require('../models/db');
const config = require('../config/config');

const storageDir = path.resolve(config.attachment.directory);
const allowedExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
const extensionToMime = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
};
const allowedAttachmentTypes = new Set(['POP', 'PAP', 'BPMN', 'Outro']);

const createError = (message, statusCode = 400, name = 'ValidationError') => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.name = name;
    return error;
};

const sanitizeOriginalName = (name) => {
    let filename = String(name || '').trim();
    filename = path.basename(filename);
    filename = filename.replace(/\x00|\x1f|\x7f|<|>|:|"|\||\?|\*|\\|\//g, '_');
    filename = filename.replace(/[\r\n\t]+/g, ' ').trim();
    if (!filename) {
        filename = 'arquivo';
    }
    if (filename.length > 250) {
        filename = filename.slice(0, 250);
    }
    return filename;
};

const getRequestIp = (req) => {
    if (!req) return null;
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return String(forwarded).split(',')[0].trim();
    }
    return req.socket?.remoteAddress || null;
};

const normalizeUserAgent = (userAgent) => {
    if (!userAgent) return null;
    return String(userAgent).replace(/[\r\n]+/g, ' ').trim().slice(0, 250);
};

const getExtension = (filename) => {
    return path.extname(filename).toLowerCase();
};

const validateSignature = (extension, buffer) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return false;
    }

    if (extension === '.pdf') {
        return buffer.slice(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]));
    }

    if (extension === '.jpg' || extension === '.jpeg') {
        return buffer.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    }

    if (extension === '.png') {
        return buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }

    return false;
};

const ensureStorageDir = async () => {
    await fs.mkdir(storageDir, { recursive: true });
};

const writeUniqueFile = async (buffer, extension) => {
    await ensureStorageDir();

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const storedName = `${crypto.randomUUID()}${extension}`;
        const filePath = path.join(storageDir, storedName);
        try {
            await fs.writeFile(filePath, buffer, { flag: 'wx' });
            return storedName;
        } catch (error) {
            if (error.code === 'EEXIST') {
                continue;
            }
            throw error;
        }
    }

    throw createError('Falha ao gerar arquivo de anexo.', 500, 'StorageError');
};

const validateFileUpload = (req) => {
    if (!req.file) {
        throw createError('Arquivo não fornecido.', 400);
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
        throw createError('Arquivo vazio.', 400);
    }

    if (req.file.size > config.attachment.maxSize) {
        throw createError('Arquivo muito grande.', 413);
    }

    const originalName = sanitizeOriginalName(req.file.originalname);
    const extension = getExtension(originalName);
    const expectedMime = extensionToMime[extension];

    if (!expectedMime) {
        throw createError('Extensão de arquivo não suportada.', 415);
    }

    if (req.file.mimetype !== expectedMime) {
        throw createError('MIME incompatível com a extensão.', 415);
    }

    if (!validateSignature(extension, req.file.buffer)) {
        throw createError('Assinatura do arquivo incompatível com o tipo informado.', 415);
    }

    return { originalName, extension, expectedMime };
};

const authorizeProcessActivity = async (processId, activityId, user) => {
    const processo = await queryOne('SELECT id, setor_id FROM processos WHERE id = $1', [processId]);
    if (!processo) {
        throw createError('Processo não encontrado', 404, 'NotFoundError');
    }

    const atividade = await queryOne(
        `SELECT a.id FROM atividades a
         INNER JOIN subprocessos s ON a.subprocesso_id = s.id
         WHERE a.id = $1 AND s.processo_id = $2`,
        [activityId, processId]
    );

    if (!atividade) {
        throw createError('Atividade não encontrada', 404, 'NotFoundError');
    }

    if (user.perfil === 'SETOR') {
        const setorUsuario = user.setor_id;
        if (!setorUsuario || processo.setor_id !== setorUsuario) {
            throw createError('Acesso não autorizado ao processo', 403, 'ForbiddenError');
        }
    }

    return { processo, atividade };
};

const getSafeAttachmentRow = (row) => ({
    id: row.id,
    tipo: row.tipo,
    nome_arquivo: row.nome_arquivo,
    tamanho_bytes: row.tamanho_bytes,
    mime_type: row.mime_type,
    enviado_por: row.enviado_por,
    descricao: row.descricao,
    data_envio: row.data_envio
});

const listAttachments = async (processId, activityId, user) => {
    await authorizeProcessActivity(processId, activityId, user);

    const rows = await queryMany(
        `SELECT id, tipo, nome_arquivo, tamanho_bytes, mime_type, enviado_por, descricao, data_envio
         FROM anexos
         WHERE processo_id = $1 AND atividade_id = $2 AND excluido_em IS NULL
         ORDER BY data_envio DESC`,
        [processId, activityId]
    );

    return rows.map(getSafeAttachmentRow);
};

const uploadAttachment = async (req, processId, activityId) => {
    const { originalName, extension, expectedMime } = validateFileUpload(req);
    const tipo = allowedAttachmentTypes.has(req.body.tipo) ? req.body.tipo : 'Outro';
    const descricao = req.body.descricao ? String(req.body.descricao).trim().slice(0, 1000) : null;

    await authorizeProcessActivity(processId, activityId, req.user);
    const hashSha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    let storedName;
    let client;
    try {
        storedName = await writeUniqueFile(req.file.buffer, extension);
        client = await beginTransaction();

        const result = await client.query(
            `INSERT INTO anexos (processo_id, atividade_id, tipo, nome_arquivo, caminho_arquivo, nome_armazenado, tamanho_bytes, mime_type, hash_sha256, enviado_por, descricao, data_envio)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
             RETURNING id, tipo, nome_arquivo, tamanho_bytes, mime_type, enviado_por, descricao, data_envio`,
            [processId, activityId, tipo, originalName, storedName, storedName, req.file.size, expectedMime, hashSha256, req.user.id, descricao]
        );

        const attachment = result.rows[0];

        await client.query(
            `INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro, valores_novos, endereco_ip, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                req.user.id,
                'UPLOAD_ANEXO',
                'anexos',
                attachment.id,
                JSON.stringify({
                    processo_id: Number(processId),
                    atividade_id: Number(activityId),
                    mime_type: expectedMime,
                    tamanho_bytes: req.file.size,
                    hash_sha256: hashSha256,
                    nome_armazenado: storedName,
                    nome_arquivo: originalName
                }),
                getRequestIp(req),
                normalizeUserAgent(req.headers['user-agent'])
            ]
        );

        await commit(client);
        return attachment;
    } catch (error) {
        if (client) {
            await rollback(client);
        }
        if (storedName) {
            await fs.unlink(path.join(storageDir, storedName)).catch(() => {});
        }
        throw error;
    }
};

const getAttachmentForDownload = async (req, processId, activityId, attachmentId) => {
    await authorizeProcessActivity(processId, activityId, req.user);

    const attachment = await queryOne(
        `SELECT id, tipo, nome_arquivo, caminho_arquivo, tamanho_bytes, mime_type, enviado_por, descricao, data_envio
         FROM anexos
         WHERE id = $1 AND processo_id = $2 AND atividade_id = $3 AND excluido_em IS NULL`,
        [attachmentId, processId, activityId]
    );

    if (!attachment) {
        throw createError('Anexo não encontrado', 404, 'NotFoundError');
    }

    const filePath = path.resolve(storageDir, attachment.caminho_arquivo);
    if (!filePath.startsWith(storageDir + path.sep) && filePath !== storageDir) {
        throw createError('Caminho de anexo inválido', 500, 'InternalError');
    }

    await fs.access(filePath);

    await query(
        `INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro, valores_novos, endereco_ip, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            req.user.id,
            'DOWNLOAD_ANEXO',
            'anexos',
            attachment.id,
            JSON.stringify({
                processo_id: Number(processId),
                atividade_id: Number(activityId),
                mime_type: attachment.mime_type,
                tamanho_bytes: attachment.tamanho_bytes,
                nome_arquivo: attachment.nome_arquivo
            }),
            getRequestIp(req),
            normalizeUserAgent(req.headers['user-agent'])
        ]
    );

    return { attachment, filePath };
};

const deleteAttachment = async (req, processId, activityId, attachmentId) => {
    await authorizeProcessActivity(processId, activityId, req.user);

    const attachment = await queryOne(
        `SELECT id FROM anexos
         WHERE id = $1 AND processo_id = $2 AND atividade_id = $3 AND excluido_em IS NULL`,
        [attachmentId, processId, activityId]
    );

    if (!attachment) {
        throw createError('Anexo não encontrado', 404, 'NotFoundError');
    }

    const client = await beginTransaction();
    try {
        await client.query(
            `UPDATE anexos
             SET excluido_em = CURRENT_TIMESTAMP,
                 excluido_por = $1
             WHERE id = $2`,
            [req.user.id, attachmentId]
        );

        await client.query(
            `INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro, valores_novos, endereco_ip, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                req.user.id,
                'EXCLUSAO_ANEXO',
                'anexos',
                attachmentId,
                JSON.stringify({ processo_id: Number(processId), atividade_id: Number(activityId) }),
                getRequestIp(req),
                normalizeUserAgent(req.headers['user-agent'])
            ]
        );

        await commit(client);
        return { mensagem: 'Anexo excluído com sucesso' };
    } catch (error) {
        await rollback(client);
        throw error;
    }
};

module.exports = {
    listAttachments,
    uploadAttachment,
    getAttachmentForDownload,
    deleteAttachment
};
