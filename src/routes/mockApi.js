// ============================================================================
// Mock API Routes para execução local sem banco de dados
// ============================================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const mockData = require('../mockData');

const { users, setores, macroprocessos, processos, indicadores, alerts, logs, atividades, generateId } = mockData;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10485760 } }).single('file');

const multerHandler = (req, res, next) => {
    upload(req, res, (err) => {
        if (err) return res.status(400).json({ error: 'Erro no upload' });
        next();
    });
};

// Garantir template Planejar em modo mock (idempotente)
const ensurePlanejarMock = (processoId, usuarioId = 1) => {
    const fixed = [
        { code: 'PLAN_A', descricao: 'Definir equipe de melhoria', ordem: 1 },
        { code: 'PLAN_B', descricao: 'Estabelecer objetivo do Projeto de Melhoria', ordem: 2 },
        { code: 'PLAN_C', descricao: 'Solicitar documentação existente do processo', ordem: 3 },
        { code: 'PLAN_D', descricao: 'Criar Diagrama de Escopo e Interface (DEIP)', ordem: 4 },
        { code: 'PLAN_E', descricao: 'Elaborar Plano de Projeto (Referente às etapas E e F do Manual)', ordem: 5 },
        { code: 'PLAN_G', descricao: 'Aprovar Plano do Projeto de Melhoria', ordem: 6 }
    ];

    const processo = processos.find(p => p.id === processoId);
    if (!processo) return;

    // Check existing Planejar activities by code
    for (const f of fixed) {
        const exists = atividades.find(a => a.processo_id === processoId && a.codigo === f.code);
        if (!exists) {
            const newAct = {
                id: generateId(atividades),
                processo_id: processoId,
                fase: 'Planejar',
                codigo: f.code,
                descricao: f.descricao,
                concluido: false,
                responsavel_id: processo.responsavel_id || 1,
                criado_em: new Date().toISOString(),
                ordem: f.ordem,
                attachments: [],
                checklist: []
            };
            atividades.push(newAct);
            appendLog(usuarioId, `Atividade ${f.code} criada (mock)`, 'atividades', newAct.id);
        }
    }
};

const createToken = (usuario) => {
    return jwt.sign(
        {
            id: usuario.id,
            email: usuario.email,
            nome: usuario.nome,
            perfil: usuario.perfil,
            setor_id: usuario.setor_id
        },
        process.env.JWT_SECRET || 'local-mock-secret',
        { expiresIn: '24h' }
    );
};

const findUserByEmail = (email) => users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.ativo);

const findUserById = (id) => users.find(u => u.id === parseInt(id, 10));

const getSetorNome = (id) => {
    const setor = setores.find(s => s.id === id);
    return setor ? setor.nome : 'Sem setor';
};

const getMacroprocessoNome = (id) => {
    const macro = macroprocessos.find(m => m.id === id);
    return macro ? macro.nome : 'Sem macroprocesso';
};

const isActiveProcess = (processo) => processo.ativo === undefined ? true : !!processo.ativo;

const hasValidProcessReference = (processo) => {
    return setores.some(setor => setor.id === processo.setor_id)
        && macroprocessos.some(macro => macro.id === processo.macroprocesso_id);
};

const getPlanejarCodeForTipo = (tipo) => {
    switch (tipo) {
        case 'documentacao': return 'PLAN_C';
        case 'deip': return 'PLAN_D';
        case 'plano': return 'PLAN_E';
        case 'ata': return 'PLAN_G';
        default: return null;
    }
};

const getPlanejarActivityByTipo = (processoId, tipo) => {
    const codigo = getPlanejarCodeForTipo(tipo);
    if (!codigo) return null;
    return atividades.find(a => a.processo_id === processoId && a.codigo === codigo);
};

const findProcessAttachment = (processoId, attachmentId) => {
    return atividades.reduce((found, atividade) => {
        if (found) return found;
        if (atividade.processo_id !== processoId || !Array.isArray(atividade.attachments)) return null;
        return atividade.attachments.find(att => att.id === attachmentId) || null;
    }, null);
};

const getResponsavelNome = (id) => {
    const usuario = users.find(u => u.id === id);
    return usuario ? usuario.nome : 'Não definido';
};

const enrichProcess = (processo) => {
    const procAtividades = (atividades || []).filter(a => a.processo_id === processo.id).map(a => ({
        id: a.id,
        fase: a.fase,
        codigo: a.codigo || null,
        descricao: a.descricao,
        ferramenta: a.ferramenta,
        produto: a.produto,
        concluido: !!a.concluido,
        responsavel_id: a.responsavel_id,
        responsavel_nome: getResponsavelNome(a.responsavel_id),
        criado_em: a.criado_em,
        attachments: (a.attachments || []).map(att => ({ id: att.id, filename: att.filename, url: att.url, criado_em: att.criado_em })),
        checklist: (a.checklist || []).map(item => ({ id: item.id, descricao: item.descricao, concluido: !!item.concluido }))
    }));

    return {
        ...processo,
        setor_nome: getSetorNome(processo.setor_id),
        macroprocesso_nome: getMacroprocessoNome(processo.macroprocesso_id),
        responsavel_nome: getResponsavelNome(processo.responsavel_id),
        atividades: procAtividades
    };
};

const appendLog = (usuarioId, acao, tabela, idRegistro) => {
    logs.push({
        id: generateId(logs),
        usuario_id: usuarioId,
        acao,
        tabela_afetada: tabela,
        id_registro: idRegistro,
        criado_em: new Date().toISOString()
    });
};

router.post('/auth/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const usuario = findUserByEmail(email);
    if (!usuario || usuario.senha !== senha) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    appendLog(usuario.id, 'Login realizado', 'usuarios', usuario.id);

    const token = createToken(usuario);
    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, setor_id: usuario.setor_id } });
});

router.get('/auth/opcoes-login', (req, res) => {
    const opcoes = users
        .filter((usuario) => usuario.ativo !== false)
        .map((usuario) => ({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil
        }));
    res.json(opcoes);
});

router.get('/auth/perfil', verifyToken, (req, res) => {
    res.json(req.user);
});

router.post('/auth/registrar', verifyToken, requireAdmin, (req, res) => {
    const {
        nome,
        email,
        senha,
        perfil,
        registration,
        organizationType,
        organizationUnitId,
        instituteId,
        regionalId,
        advisoryId,
        nucleusId,
        sectorId,
        active
    } = req.body;

    if (!nome || !email || !senha || !perfil) {
        return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    // Accept a broader set of profiles in the mock API
    const allowedProfiles = ['NGE', 'DIRETOR_INSTITUTO', 'SUBCOORDENADOR_REGIONAL', 'SUBCOORDENADOR_INSTITUTO', 'SUBCOORDENADOR_FINANCEIRA', 'SUBCOORDENADOR_ADMINISTRATIVA', 'ASSESSOR', 'CHEFE_NUCLEO', 'CHEFE_SETOR', 'OPERACIONAL', 'SETOR'];
    if (!allowedProfiles.includes(perfil)) {
        return res.status(400).json({ error: 'Perfil inválido' });
    }

    if (findUserByEmail(email)) {
        return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    // determine setor_id for legacy compatibility (prefer sectorId, then organizationUnitId)
    const setor_id = sectorId ? parseInt(sectorId, 10) : (organizationUnitId ? parseInt(organizationUnitId, 10) : null);

    const newUser = {
        id: generateId(users),
        nome,
        email,
        senha,
        perfil,
        matricula: registration || null,
        setor_id: setor_id || null,
        ativo: active === undefined ? true : Boolean(active)
    };

    users.push(newUser);
    appendLog(req.user.id, 'Usuário registrado', 'usuarios', newUser.id);

    res.status(201).json({
        id: newUser.id,
        nome: newUser.nome,
        email: newUser.email,
        perfil: newUser.perfil,
        setor_id: newUser.setor_id,
        setor_nome: getSetorNome(newUser.setor_id),
        ativo: newUser.ativo
    });
});

router.get('/auth/usuarios', verifyToken, requireAdmin, (req, res) => {
    const result = users.map(u => ({ id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, setor_id: u.setor_id, setor_nome: getSetorNome(u.setor_id), ativo: u.ativo }));
    res.json(result);
});

router.get('/auth/usuarios/:id', verifyToken, (req, res) => {
    const usuario = findUserById(req.params.id);
    if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (req.user.id !== usuario.id && req.user.perfil !== 'NGE') {
        return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, setor_id: usuario.setor_id, ativo: usuario.ativo });
});

router.put('/auth/usuarios/:id', verifyToken, (req, res) => {
    const usuario = findUserById(req.params.id);
    if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (req.user.id !== usuario.id && req.user.perfil !== 'NGE') {
        return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    usuario.nome = req.body.nome || usuario.nome;
    usuario.email = req.body.email || usuario.email;
    usuario.perfil = req.body.perfil || usuario.perfil;
    usuario.setor_id = req.body.setor_id || usuario.setor_id;
    usuario.ativo = req.body.ativo !== undefined ? req.body.ativo : usuario.ativo;

    res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, setor_id: usuario.setor_id, ativo: usuario.ativo });
});

router.delete('/auth/usuarios/:id', verifyToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    // Validar ID
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID de usuário inválido' });
    }
    
    // Não permitir deletar a si mesmo
    if (req.user.id === parseInt(id)) {
        return res.status(400).json({ error: 'Não é possível deletar sua própria conta.' });
    }

    const usuario = findUserById(id);
    if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Soft delete - marcar como inativo
    usuario.ativo = false;
    usuario.deletedAt = new Date().toISOString();

    res.status(200).json({ message: 'Usuário inativado com sucesso', usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, ativo: usuario.ativo } });
});

// Armazenamento de tokens de reset em memória
const resetTokens = new Map();

// Função para gerar token aleatório
const generateResetToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

router.post('/auth/alterar-senha', verifyToken, (req, res) => {
    const { senhaAtual, novaSenha } = req.body;
    const usuario = findUserById(req.user.id);

    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    if (!usuario || usuario.senha !== senhaAtual) {
        return res.status(401).json({ error: 'Senha atual inválida' });
    }

    usuario.senha = novaSenha;
    res.json({ mensagem: 'Senha alterada com sucesso' });
});

/**
 * POST /api/auth/solicitar-reset-senha
 * Solicitar recuperação de senha
 */
router.post('/auth/solicitar-reset-senha', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'E-mail é obrigatório' });
    }

    const usuario = findUserByEmail(email);

    if (!usuario) {
        // Por segurança, não informar se o email existe ou não
        return res.status(200).json({ message: 'Se o e-mail existir, um link de recuperação será enviado', token: 'token_nao_valido' });
    }

    // Gerar token de reset
    const token = generateResetToken();
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hora de validade

    // Armazenar token
    resetTokens.set(token, {
        email: usuario.email,
        userId: usuario.id,
        expiresAt
    });

    // Log para desenvolvimento
    console.log(`[Reset Senha] Token gerado para ${usuario.email}: ${token}`);

    res.json({
        message: 'E-mail de recuperação enviado com sucesso',
        token, // Para dev - em prod seria apenas no email
        resetLink: `${req.protocol}://${req.get('host')}/?reset=${token}`
    });
});

/**
 * POST /api/auth/reset-senha
 * Redefinir senha com token
 */
router.post('/auth/reset-senha', (req, res) => {
    const { email, token, novaSenha } = req.body;

    if (!email || !token || !novaSenha) {
        return res.status(400).json({ error: 'E-mail, token e nova senha são obrigatórios' });
    }

    // Validar token
    const tokenData = resetTokens.get(token);

    if (!tokenData) {
        return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    if (tokenData.expiresAt < Date.now()) {
        resetTokens.delete(token);
        return res.status(400).json({ error: 'Token expirado. Solicite um novo link de recuperação' });
    }

    if (tokenData.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ error: 'E-mail não corresponde ao token' });
    }

    // Encontrar usuário e atualizar senha
    const usuario = findUserByEmail(email);

    if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    usuario.senha = novaSenha;
    resetTokens.delete(token);

    console.log(`[Reset Senha] Senha redefinida para ${usuario.email}`);

    res.json({
        message: 'Senha redefinida com sucesso',
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }
    });
});

router.get('/processes', verifyToken, (req, res) => {
    const { setor_id, status_fase } = req.query;
    let resultado = [...processos];

    if (req.user.perfil === 'SETOR') {
        resultado = resultado.filter(p => p.setor_id === req.user.setor_id);
    } else if (setor_id) {
        resultado = resultado.filter(p => p.setor_id === parseInt(setor_id, 10));
    }

    if (status_fase) {
        resultado = resultado.filter(p => p.status_fase === status_fase);
    }

    // Filtrar apenas processos ativos e válidos
    resultado = resultado.filter(p => isActiveProcess(p) && hasValidProcessReference(p));

    // Garantir template Planejar para cada processo listado
    resultado.forEach(p => ensurePlanejarMock(p.id, req.user.id));

    res.json(resultado.map(enrichProcess));
});

router.get('/processes/estatisticas/geral', verifyToken, (req, res) => {
    const { setor_id } = req.query;
    let items = processos.filter(isActiveProcess).filter(hasValidProcessReference);

    if (req.user.perfil === 'SETOR') {
        items = items.filter(p => p.setor_id === req.user.setor_id);
    } else if (setor_id) {
        items = items.filter(p => p.setor_id === parseInt(setor_id, 10));
    }

    const porStatus = items.reduce((acc, item) => {
        acc[item.status_fase] = (acc[item.status_fase] || 0) + 1;
        return acc;
    }, {});

    const matchingIndicators = indicadores.filter(ind => items.some(p => p.id === ind.processo_id));
    const conformidade = matchingIndicators.reduce((sum, ind) => sum + (ind.valor_meta > 0 ? (ind.valor_atual / ind.valor_meta) * 100 : 0), 0);
    const media = matchingIndicators.length ? Math.round(conformidade / matchingIndicators.length) : 0;

    res.json({ processos: { porStatus, total: items.length }, indicadores: { conformidadeMedia: media }, dataGeracao: new Date().toISOString() });
});

router.get('/processes/:id', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo || !isActiveProcess(processo) || !hasValidProcessReference(processo)) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
        return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    }

    // Garantir template Planejar no mock
    ensurePlanejarMock(processo.id, req.user.id);

    res.json(enrichProcess(processo));
});

router.get('/planejar/processo/:processoId', verifyToken, (req, res) => {
    const processoId = parseInt(req.params.processoId, 10);
    const processo = processos.find(p => p.id === processoId);
    if (!processo || !isActiveProcess(processo) || !hasValidProcessReference(processo)) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
        return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    }

    ensurePlanejarMock(processo.id, req.user.id);

    res.json({
        id: processo.id,
        processo_id: processo.id,
        objetivo: '',
        swot: [],
        cronograma: [],
        equipe: [],
        plano_projeto: {},
        checklist: [],
        aprovacao_checklist: [],
        status: 'NÃO_INICIADA',
        responsavel_id: req.user.id,
        devolucao_justificativa: null,
        aprovado_por: null,
        aprovado_em: null,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    });
});

router.get('/planejar/:processoId/:tipo', verifyToken, (req, res) => {
    const processoId = parseInt(req.params.processoId, 10);
    const processo = processos.find(p => p.id === processoId);
    if (!processo || !isActiveProcess(processo) || !hasValidProcessReference(processo)) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
        return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    }

    ensurePlanejarMock(processo.id, req.user.id);
    const atividade = getPlanejarActivityByTipo(processoId, req.params.tipo);
    if (!atividade) {
        return res.status(404).json({ error: 'Atividade Planejar não encontrada' });
    }

    res.json({ attachments: (atividade.attachments || []).map(att => ({ id: att.id, nome_arquivo: att.filename, filename: att.filename, url: att.url })) });
});

router.post('/planejar/:processoId/:tipo', verifyToken, multerHandler, (req, res) => {
    const processoId = parseInt(req.params.processoId, 10);
    const processo = processos.find(p => p.id === processoId);
    if (!processo || !isActiveProcess(processo) || !hasValidProcessReference(processo)) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
        return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    }

    ensurePlanejarMock(processo.id, req.user.id);
    const atividade = getPlanejarActivityByTipo(processoId, req.params.tipo);
    if (!atividade) {
        return res.status(404).json({ error: 'Atividade Planejar não encontrada' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Arquivo é obrigatório' });
    }

    atividade.attachments = atividade.attachments || [];
    const attachment = {
        id: generateId(atividade.attachments),
        filename: req.file.originalname,
        url: null,
        criado_em: new Date().toISOString(),
        usuario_id: req.user.id
    };
    atividade.attachments.push(attachment);
    appendLog(req.user.id, 'Anexo Planejar criado', 'planejar_anexos', attachment.id);
    res.status(201).json(attachment);
});

router.get('/planejar/:processoId/anexo/:attachmentId/download', verifyToken, (req, res) => {
    const processoId = parseInt(req.params.processoId, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const processo = processos.find(p => p.id === processoId);
    if (!processo || !isActiveProcess(processo) || !hasValidProcessReference(processo)) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
        return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    }

    const attachment = findProcessAttachment(processoId, attachmentId);
    if (!attachment) {
        return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename.replace(/\"/g, '')}"`);
    res.send(`Arquivo simulado para ${attachment.filename}`);
});

router.delete('/planejar/:processoId/anexo/:attachmentId', verifyToken, (req, res) => {
    const processoId = parseInt(req.params.processoId, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const processo = processos.find(p => p.id === processoId);
    if (!processo || !isActiveProcess(processo) || !hasValidProcessReference(processo)) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
        return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    }

    const atividade = atividades.find(a => a.processo_id === processoId && Array.isArray(a.attachments) && a.attachments.some(att => att.id === attachmentId));
    if (!atividade) {
        return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    atividade.attachments = atividade.attachments.filter(att => att.id !== attachmentId);
    appendLog(req.user.id, 'Anexo Planejar removido', 'planejar_anexos', attachmentId);
    res.json({ mensagem: 'Anexo removido' });
});


// Atividades relacionadas a um processo
router.get('/processes/:id/activities', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo || !isActiveProcess(processo) || !hasValidProcessReference(processo)) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const { fase } = req.query;
    let resultado = (atividades || []).filter(a => a.processo_id === processo.id);
    if (fase) resultado = resultado.filter(a => a.fase === fase);
    const mapped = resultado.map(a => ({ ...a, responsavel_nome: getResponsavelNome(a.responsavel_id) }));
    res.json({ atividades: mapped });
});

router.post('/processes/:id/activities', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo || !isActiveProcess(processo) || !hasValidProcessReference(processo)) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    // Para processos que usam o fluxo BPM com fases fixas (ex: Planejar),
    // não permitimos criação livre de atividades pela API mock.
    // Retornar 403 para indicar operação proibida.
    return res.status(403).json({ error: 'Criação de atividades manual é desabilitada para processos BPM. Atividades são geradas automaticamente.' });
});

router.put('/processes/:id/activities/:aid', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const atividade = atividades.find(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

    // Bloquear alteração de atividades fixas (PLAN_*)
    const fixedCodes = ['PLAN_A','PLAN_B','PLAN_C','PLAN_D','PLAN_E','PLAN_G'];
    if (atividade.codigo && fixedCodes.includes(atividade.codigo)) {
        if (req.body.descricao && req.body.descricao !== atividade.descricao) {
            return res.status(403).json({ error: 'Edição do nome de atividades fixas é proibida' });
        }
    }

    atividade.descricao = req.body.descricao || atividade.descricao;
    if (req.body.concluido !== undefined) atividade.concluido = !!req.body.concluido;
    if (req.body.responsavel_id) atividade.responsavel_id = parseInt(req.body.responsavel_id, 10);

    appendLog(req.user.id, 'Atividade atualizada', 'atividades', atividade.id);
    res.json({ ...atividade, responsavel_nome: getResponsavelNome(atividade.responsavel_id), attachments: (atividade.attachments||[]), checklist: atividade.checklist || [] });
});

// Checklist endpoints
router.put('/processes/:id/activities/:aid/checklist/:cid', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const atividade = atividades.find(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

    atividade.checklist = atividade.checklist || [];
    const item = atividade.checklist.find(i => i.id === parseInt(req.params.cid, 10));
    if (!item) return res.status(404).json({ error: 'Item de checklist não encontrado' });

    if (req.body.concluido !== undefined) item.concluido = !!req.body.concluido;
    if (req.body.descricao) item.descricao = req.body.descricao;

    appendLog(req.user.id, 'Checklist atualizado', 'atividades_checklist', item.id);
    res.json(item);
});

router.post('/processes/:id/activities/:aid/checklist', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const atividade = atividades.find(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

    const { descricao } = req.body;
    if (!descricao) return res.status(400).json({ error: 'descricao é obrigatória' });

    atividade.checklist = atividade.checklist || [];
    const novoItem = { id: generateId(atividade.checklist), descricao, concluido: false };
    atividade.checklist.push(novoItem);
    appendLog(req.user.id, 'Checklist criado', 'atividades_checklist', novoItem.id);
    res.status(201).json(novoItem);
});

// Attachments endpoints
router.post('/processes/:id/activities/:aid/attachments', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const atividade = atividades.find(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

    const { filename, url } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename é obrigatório' });

    atividade.attachments = atividade.attachments || [];
    const novo = { id: generateId(atividade.attachments), filename, url: url || null, criado_em: new Date().toISOString(), usuario_id: req.user.id };
    atividade.attachments.push(novo);
    appendLog(req.user.id, 'Anexo criado', 'atividades_anexos', novo.id);
    res.status(201).json(novo);
});

router.delete('/processes/:id/activities/:aid/attachments/:anid', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const atividade = atividades.find(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

    atividade.attachments = atividade.attachments || [];
    const idx = atividade.attachments.findIndex(at => at.id === parseInt(req.params.anid, 10));
    if (idx === -1) return res.status(404).json({ error: 'Anexo não encontrado' });

    const rem = atividade.attachments.splice(idx, 1)[0];
    appendLog(req.user.id, 'Anexo removido', 'atividades_anexos', rem.id);
    res.json({ mensagem: 'Anexo removido' });
});

router.delete('/processes/:id/activities/:aid', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const idx = atividades.findIndex(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (idx === -1) return res.status(404).json({ error: 'Atividade não encontrada' });

    const atividade = atividades[idx];
    const fixedCodes = ['PLAN_A','PLAN_B','PLAN_C','PLAN_D','PLAN_E','PLAN_G'];
    if (atividade.codigo && fixedCodes.includes(atividade.codigo)) {
        return res.status(403).json({ error: 'Exclusão de atividades fixas é proibida' });
    }

    const rem = atividades.splice(idx, 1)[0];
    appendLog(req.user.id, 'Atividade removida', 'atividades', rem.id);
    res.json({ mensagem: 'Atividade removida' });
});

router.post('/processes', verifyToken, (req, res) => {
    const setorId = req.user.perfil === 'SETOR' ? req.user.setor_id : parseInt(req.body.setor_id, 10) || 1;
    const novo = {
        id: generateId(processos),
        nome: req.body.nome || 'Novo processo',
        setor_id: setorId,
        macroprocesso_id: parseInt(req.body.macroprocesso_id, 10) || 1,
        status_fase: 'Planejar',
        percentual_conclusao: 0,
        responsavel_id: req.user.id,
        data_inicio: req.body.data_inicio || new Date().toISOString().split('T')[0],
        data_fim: req.body.data_fim || null,
        observacoes: req.body.observacoes || '',
        criado_em: new Date().toISOString()
    };

    processos.push(novo);
    appendLog(req.user.id, 'Processo criado', 'processos', novo.id);
    // Adicionar atividades padrão da fase Planejar (idempotente para mock)
    const fixedPlanejar = [
        { codigo: 'PLAN_A', descricao: 'Estabelecer objetivo do Projeto de Melhoria' },
        { codigo: 'PLAN_B', descricao: 'Definir equipe de melhoria' },
        { codigo: 'PLAN_C', descricao: 'Solicitar documentação existente do processo' },
        { codigo: 'PLAN_D', descricao: 'Criar Diagrama de Escopo e Interface (DEIP) da situação atual' },
        { codigo: 'PLAN_E', descricao: 'Anexar evidências e elaborar Plano de Projeto' },
        { codigo: 'PLAN_G', descricao: 'Aprovar Plano do Projeto de Melhoria (Ata)'}
    ];

    fixedPlanejar.forEach(item => {
        const act = {
            id: generateId(atividades),
            processo_id: novo.id,
            fase: 'Planejar',
            descricao: item.descricao,
            codigo: item.codigo,
            concluido: false,
            responsavel_id: req.user.id,
            criado_em: new Date().toISOString()
        };
        atividades.push(act);
        appendLog(req.user.id, 'Atividade criada (padrão Planejar)', 'atividades', act.id);
    });

    res.status(201).json(enrichProcess(novo));
});

router.put('/processes/:id', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
        return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    }

    processo.nome = req.body.nome || processo.nome;
    processo.setor_id = req.user.perfil === 'SETOR' ? processo.setor_id : (req.body.setor_id ? parseInt(req.body.setor_id, 10) : processo.setor_id);
    processo.macroprocesso_id = req.body.macroprocesso_id ? parseInt(req.body.macroprocesso_id, 10) : processo.macroprocesso_id;
    processo.status_fase = req.body.status_fase || processo.status_fase;
    processo.percentual_conclusao = req.body.percentual_conclusao !== undefined ? parseInt(req.body.percentual_conclusao, 10) : processo.percentual_conclusao;
    processo.observacoes = req.body.observacoes || processo.observacoes;
    processo.data_fim = req.body.data_fim || processo.data_fim;

    appendLog(req.user.id, 'Processo atualizado', 'processos', processo.id);
    res.json(enrichProcess(processo));
});

router.delete('/processes/:id', verifyToken, (req, res) => {
    const { isGlobalAdmin } = require('../services/roles');
    const senha = req.body && req.body.senha ? String(req.body.senha) : null;

    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    const doDelete = (userValid) => {
        if (!userValid) return res.status(403).json({ error: 'Senha inválida' });
        processo.ativo = false;
        processo.excluido_em = new Date().toISOString();
        processo.excluido_por = req.user.id;
        appendLog(req.user.id, 'REMOCAO_PROCESSO', 'processos', processo.id);
        return res.json({ mensagem: 'Processo removido logicamente' });
    };

    // Allow global admins to delete without senha in mock
    if (isGlobalAdmin(req.user.perfil)) {
        return doDelete(true);
    }

    if (!senha) return res.status(400).json({ error: 'Senha é obrigatória para remoção' });

    // Verificar senha do usuário mock
    const { verifyPassword } = require('../models/userStore');
    const usuarioValido = verifyPassword ? require('../models/userStore').verifyPassword(req.user.email, senha) : null;
    Promise.resolve(usuarioValido).then((u) => doDelete(Boolean(u))).catch(() => res.status(403).json({ error: 'Senha inválida' }));
});

router.get('/processes/:id/indicadores', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
        return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    }

    const resultado = indicadores.filter(i => i.processo_id === processo.id);
    res.json(resultado);
});

router.get('/indicators', verifyToken, (req, res) => {
    if (req.user.perfil === 'SETOR') {
        const setorId = req.user.setor_id;
        const processosDoSetor = processos.filter(p => p.setor_id === setorId).map(p => p.id);
        const resultado = indicadores.filter(i => processosDoSetor.includes(i.processo_id));
        return res.json(resultado);
    }

    res.json(indicadores);
});

router.get('/indicators/:id', verifyToken, (req, res) => {
    const indicador = indicadores.find(i => i.id === parseInt(req.params.id, 10));
    if (!indicador) {
        return res.status(404).json({ error: 'Indicador não encontrado' });
    }

    if (req.user.perfil === 'SETOR') {
        const processo = processos.find(p => p.id === indicador.processo_id);
        if (processo && processo.setor_id !== req.user.setor_id) {
            return res.status(403).json({ error: 'Acesso não autorizado ao indicador' });
        }
    }

    res.json(indicador);
});

router.put('/indicators/:id/valor', verifyToken, (req, res) => {
    const indicador = indicadores.find(i => i.id === parseInt(req.params.id, 10));
    if (!indicador) {
        return res.status(404).json({ error: 'Indicador não encontrado' });
    }

    if (req.body.novoValor === undefined) {
        return res.status(400).json({ error: 'novoValor é obrigatório' });
    }

    if (req.user.perfil === 'SETOR') {
        const processo = processos.find(p => p.id === indicador.processo_id);
        if (processo && processo.setor_id !== req.user.setor_id) {
            return res.status(403).json({ error: 'Acesso não autorizado ao indicador' });
        }
    }

    indicador.valor_atual = parseFloat(req.body.novoValor);
    indicador.atualizado_em = new Date().toISOString();
    appendLog(req.user.id, 'Indicador atualizado', 'indicadores', indicador.id);
    res.json(indicador);
});

router.get('/indicators/setor/:setorId', verifyToken, (req, res) => {
    const setorId = parseInt(req.params.setorId, 10);
    if (req.user.perfil === 'SETOR' && req.user.setor_id !== setorId) {
        return res.status(403).json({ error: 'Acesso restrito ao setor' });
    }

    const processosDoSetor = processos.filter(p => p.setor_id === setorId).map(p => p.id);
    const resultado = indicadores.filter(i => processosDoSetor.includes(i.processo_id));
    res.json(resultado);
});

router.get('/reports/processos', verifyToken, (req, res) => {
    let dados = processos.filter(isActiveProcess).filter(hasValidProcessReference);
    if (req.user.perfil === 'SETOR') {
        dados = dados.filter(p => p.setor_id === req.user.setor_id);
    }
    res.json({ dados: dados.map(enrichProcess), resumo: { total: dados.length }, dataGeracao: new Date().toISOString() });
});

router.get('/reports/indicadores', verifyToken, (req, res) => {
    let resultado = [...indicadores];
    if (req.user.perfil === 'SETOR') {
        const processosDoSetor = processos.filter(p => p.setor_id === req.user.setor_id).map(p => p.id);
        resultado = resultado.filter(i => processosDoSetor.includes(i.processo_id));
    }
    res.json({ dados: resultado, resumo: { total: resultado.length }, dataGeracao: new Date().toISOString() });
});

router.get('/reports/dashboard', verifyToken, (req, res) => {
    let items = processos.filter(isActiveProcess).filter(hasValidProcessReference);

    if (req.user.perfil === 'SETOR') {
        items = items.filter(p => p.setor_id === req.user.setor_id);
    }

    const porStatus = items.reduce((acc, processo) => {
        acc[processo.status_fase] = (acc[processo.status_fase] || 0) + 1;
        return acc;
    }, {});

    const total = items.length;
    const matchingIndicators = indicadores.filter(ind => items.some(p => p.id === ind.processo_id));

    const checklistEntries = items.reduce((acc, processo) => {
        const procAtividades = atividades.filter(a => a.processo_id === processo.id);
        procAtividades.forEach((atividade) => {
            const checklist = Array.isArray(atividade.checklist) ? atividade.checklist : [];
            checklist.forEach((item) => {
                acc.push({ concluido: !!item.concluido });
            });
        });
        return acc;
    }, []);

    const checklistTotal = checklistEntries.length;
    const checklistConcluidas = checklistEntries.filter((item) => item.concluido).length;
    const checklistPendentes = Math.max(checklistTotal - checklistConcluidas, 0);
    const conformidadeMedia = checklistTotal > 0
        ? Math.min(100, Math.round((checklistConcluidas / checklistTotal) * 100))
        : (matchingIndicators.length
            ? Math.round(matchingIndicators.reduce((sum, indicador) => sum + (indicador.valor_meta > 0 ? (indicador.valor_atual / indicador.valor_meta) * 100 : 0), 0) / matchingIndicators.length)
            : 0);

    const activities = atividades.filter((atividade) => {
        const processo = processos.find((p) => p.id === atividade.processo_id);
        return processo && items.some((p) => p.id === processo.id);
    });

    const pendentes = activities.filter((atividade) => !['concluído', 'concluido'].includes(String(atividade.status || '').toLowerCase())).length;
    const atrasadas = 0;

    const progress = {
        concluido: items.filter((processo) => Number(processo.percentual_conclusao || 0) >= 100).length,
        emAndamento: items.filter((processo) => Number(processo.percentual_conclusao || 0) > 0 && Number(processo.percentual_conclusao || 0) < 100).length,
        pendente: items.filter((processo) => Number(processo.percentual_conclusao || 0) === 0).length
    };

    const porFaseConformidade = items.reduce((acc, processo) => {
        const fase = processo.status_fase || 'Não informado';
        acc[fase] = acc[fase] || [];
        acc[fase].push(Number(processo.percentual_conclusao || 0));
        return acc;
    }, {});

    const porFaseConformidadeAverage = Object.entries(porFaseConformidade).reduce((result, [fase, values]) => {
        const average = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
        result[fase] = average;
        return result;
    }, {});

    res.json({
        processos: { porStatus, total, porFaseConformidade: porFaseConformidadeAverage },
        indicadores: { conformidadeMedia, total: matchingIndicators.length },
        atividades: { total: checklistTotal, concluidas: checklistConcluidas, pendentes: checklistPendentes, atrasadas },
        progresso: { porStatus: progress },
        evolucao: { temporal: [] },
        dataGeracao: new Date().toISOString()
    });
});

router.get('/reports/logs', verifyToken, (req, res) => {
    const resultado = req.user.perfil === 'SETOR'
        ? logs.filter(log => log.usuario_id === req.user.id)
        : logs;
    res.json({ logs: resultado, total: resultado.length, dataGeracao: new Date().toISOString() });
});

/**
 * GET /api/reports/processos/pdf
 * Gerar relatório de processos em PDF (Mock)
 */
router.get('/reports/processos/pdf', verifyToken, async (req, res, next) => {
    try {
        console.log('[PDF] Iniciando geração de relatório de processos');
        const PDFGenerator = require('../services/pdfGenerator');
        
        let dados = processos.filter(isActiveProcess).filter(hasValidProcessReference);
        console.log(`[PDF] Processos filtrados: ${dados.length}`);
        
        // Aplicar filtros se fornecidos
        const { setor_id } = req.query;
        if (setor_id && req.user.perfil !== 'SETOR') {
            dados = dados.filter(p => p.setor_id === parseInt(setor_id, 10));
        } else if (req.user.perfil === 'SETOR') {
            dados = dados.filter(p => p.setor_id === req.user.setor_id);
        }

        // Calcular totais
        const totais = {
            total: dados.length,
            porStatus: {},
            percentualMedioConformidade: 0
        };

        dados.forEach(p => {
            totais.porStatus[p.status_fase] = (totais.porStatus[p.status_fase] || 0) + 1;
            totais.percentualMedioConformidade += p.percentual_conclusao || 0;
        });

        if (dados.length > 0) {
            totais.percentualMedioConformidade /= dados.length;
        }

        // Gerar PDF
        console.log('[PDF] Gerando PDF buffer...');
        const pdfBuffer = await PDFGenerator.gerarRelatarioProcessos(dados, totais, req.query);
        console.log(`[PDF] PDF gerado com sucesso: ${pdfBuffer.length} bytes`);

        // Enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio_processos_${new Date().getTime()}.pdf"`);
        res.send(pdfBuffer);
        console.log('[PDF] PDF enviado ao cliente');
    } catch (error) {
        console.error('[PDF] Erro ao gerar PDF:', error.message);
        console.error('[PDF] Stack trace:', error.stack);
        next(error);
    }
});

/**
 * GET /api/reports/indicadores/pdf
 * Gerar relatório de indicadores em PDF (Mock)
 */
router.get('/reports/indicadores/pdf', verifyToken, async (req, res, next) => {
    try {
        const PDFGenerator = require('../services/pdfGenerator');
        
        let dados = [...indicadores];
        
        // Aplicar filtros
        if (req.user.perfil === 'SETOR') {
            const processosDoSetor = processos.filter(p => p.setor_id === req.user.setor_id).map(p => p.id);
            dados = dados.filter(i => processosDoSetor.includes(i.processo_id));
        }

        // Calcular totais
        const totais = {
            total: dados.length,
            porTipo: {},
            conformidadeMedia: 0
        };

        dados.forEach(i => {
            totais.porTipo[i.tipo_indicador] = (totais.porTipo[i.tipo_indicador] || 0) + 1;
            if (i.valor_meta > 0) {
                totais.conformidadeMedia += (i.valor_atual / i.valor_meta) * 100;
            }
        });

        if (dados.length > 0) {
            totais.conformidadeMedia /= dados.length;
            totais.conformidadeMedia = Math.min(totais.conformidadeMedia, 100);
        }

        // Gerar PDF
        const pdfBuffer = await PDFGenerator.gerarRelatarioIndicadores(dados, totais, req.query);

        // Enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio_indicadores_${new Date().getTime()}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports/logs/pdf
 * Gerar relatório de auditoria em PDF (Mock)
 */
router.get('/reports/logs/pdf', verifyToken, async (req, res, next) => {
    try {
        const PDFGenerator = require('../services/pdfGenerator');
        
        const dados = req.user.perfil === 'SETOR'
            ? logs.filter(log => log.usuario_id === req.user.id)
            : logs;

        // Gerar PDF
        const pdfBuffer = await PDFGenerator.gerarRelatarioLogs(dados, req.query);

        // Enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio_auditoria_${new Date().getTime()}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/processes/:id/pop
 * Gerar Procedimento Operacional Padrão (POP) em PDF (Mock)
 */
router.post('/processes/:id/pop', verifyToken, async (req, res, next) => {
    try {
        console.log('[POP] Iniciando geração de Procedimento Operacional Padrão');
        const POPGenerator = require('../services/popGenerator');
        
        const processoId = parseInt(req.params.id, 10);
        
        // Usar os dados enviados no body ou procurar no array
        let processo = req.body.processo;
        
        if (!processo) {
            processo = processos.find(p => p.id === processoId);
        }
        
        if (!processo) {
            return res.status(404).json({ error: 'Processo não encontrado' });
        }

        // Verificar permissão
        if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        console.log(`[POP] Processo encontrado: ${processo.nome}`);

        // Coletar dados de atividades de todas as fases
        const atividadesProcesso = atividades.filter(a => a.processo_id === processoId);
        console.log(`[POP] Atividades encontradas: ${atividadesProcesso.length}`);

        // Organizar dados por atividade
        const dadosAtividades = {};
        atividadesProcesso.forEach(a => {
            dadosAtividades[a.codigo] = a.dados || {};
        });

        // Gerar PDF do POP
        console.log('[POP] Gerando PDF buffer...');
        const pdfBuffer = await POPGenerator.gerarPOP(processo, dadosAtividades, req.query);
        console.log(`[POP] POP gerado com sucesso: ${pdfBuffer.length} bytes`);

        // Enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="POP_${processo.nome.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf"`);
        res.send(pdfBuffer);
        console.log('[POP] PDF enviado ao cliente');
    } catch (error) {
        console.error('[POP] Erro ao gerar POP:', error.message);
        console.error('[POP] Stack trace:', error.stack);
        next(error);
    }
});

module.exports = router;

module.exports = router;
