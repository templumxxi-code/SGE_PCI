// ============================================================================
// Planejar Routes - Fase de Planejamento BPM
// Polícia Científica do Rio Grande do Norte
// ============================================================================

const express = require('express');
const router = express.Router();
const planejarController = require('../controllers/planejarController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const attachmentController = require('../controllers/attachmentController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10485760 },
}).single('file');

const multerHandler = (req, res, next) => {
    upload(req, res, (err) => {
        if (err) return res.status(400).json({ error: 'Erro no upload' });
        next();
    });
};

const legacyUserId = (req) => req.user.legacyUserId ?? req.user.id;
const legacyUser = (req) => ({ ...req.user, id: legacyUserId(req) });

/**
 * GET /api/planejar/:processoId
 * Obter dados da fase Planejar para um processo
 */
router.get('/processo/:processoId', verifyToken, async (req, res, next) => {
    try {
        const dados = await planejarController.getPlanejar(parseInt(req.params.processoId), legacyUser(req));
        res.json(dados);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/planejar/:processoId
 * Criar ou atualizar projeto de planejamento
 */
router.post('/processo/:processoId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const dados = await planejarController.criarProjetoPlanejamento(processoId, req.body, legacyUserId(req), req.user.perfil);
        res.status(201).json(dados);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/planejar/:processoId
 * Atualizar projeto de planejamento (rascunho)
 */
router.put('/processo/:processoId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const dados = await planejarController.updatePlanejar(processoId, req.body, legacyUser(req));
        res.json(dados);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/planejar/:processoId/enviar-validacao
 * Enviar projeto para validação
 */
router.post('/processo/:processoId/enviar-validacao', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const dados = await planejarController.submitPlanejar(processoId, req.body, legacyUser(req));
        res.json(dados);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/planejar/:processoId/aprovar
 * Aprovar projeto de planejamento
 */
router.post('/processo/:processoId/aprovar', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const dados = await planejarController.approvePlanejar(processoId, legacyUser(req));
        res.json(dados);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/planejar/:processoId/devolver
 * Devolver projeto para correção
 */
router.post('/processo/:processoId/devolver', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const dados = await planejarController.rejectPlanejar(processoId, req.body, legacyUser(req));
        res.json(dados);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/planejar/:processoId/historico
 * Obter histórico da fase Planejar
 */
router.get('/processo/:processoId/historico', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const historico = await planejarController.obterHistoricoProjeto(processoId, req.user.id, req.user.perfil);
        res.json(historico);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// SWOT Endpoints
// ============================================================================

/**
 * POST /api/planejar/swot/:processoId/adicionar
 * Adicionar item SWOT
 */
router.post('/swot/adicionar/:processoId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const swot = await planejarController.adicionarSwot(processoId, req.body, req.user.id, req.user.perfil);
        res.status(201).json(swot);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/planejar/swot/:processoId
 * Obter SWOT
 */
router.get('/swot/:processoId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const swot = await planejarController.obterSwot(processoId, req.user.id, req.user.perfil);
        res.json(swot);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/planejar/swot/:swotId
 * Remover item SWOT
 */
router.delete('/swot/:swotId', verifyToken, async (req, res, next) => {
    try {
        await planejarController.removerSwot(parseInt(req.params.swotId), req.user.id, req.user.perfil);
        res.json({ message: 'Item SWOT removido com sucesso' });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// Cronograma Endpoints
// ============================================================================

/**
 * POST /api/planejar/cronograma/:processoId/adicionar
 * Adicionar cronograma
 */
router.post('/cronograma/adicionar/:processoId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const cronograma = await planejarController.adicionarCronograma(processoId, req.body, req.user.id, req.user.perfil);
        res.status(201).json(cronograma);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/planejar/cronograma/:processoId
 * Obter cronogramas
 */
router.get('/cronograma/:processoId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const cronogramas = await planejarController.obterCronogramas(processoId, req.user.id, req.user.perfil);
        res.json(cronogramas);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/planejar/cronograma/:cronogramaId
 * Atualizar cronograma
 */
router.put('/cronograma/:cronogramaId', verifyToken, async (req, res, next) => {
    try {
        const cronograma = await planejarController.atualizarCronograma(parseInt(req.params.cronogramaId), req.body, req.user.id, req.user.perfil);
        res.json(cronograma);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/planejar/cronograma/:cronogramaId
 * Remover cronograma
 */
router.delete('/cronograma/:cronogramaId', verifyToken, async (req, res, next) => {
    try {
        await planejarController.removerCronograma(parseInt(req.params.cronogramaId), req.user.id, req.user.perfil);
        res.json({ message: 'Cronograma removido com sucesso' });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// Equipe Endpoints
// ============================================================================

/**
 * POST /api/planejar/equipe/:processoId/adicionar
 * Adicionar membro da equipe
 */
router.post('/equipe/adicionar/:processoId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const membro = await planejarController.adicionarEquipeMembro(processoId, req.body, req.user.id, req.user.perfil);
        res.status(201).json(membro);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/planejar/equipe/:processoId
 * Obter equipe
 */
router.get('/equipe/:processoId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const equipe = await planejarController.obterEquipe(processoId, req.user.id, req.user.perfil);
        res.json(equipe);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/planejar/equipe/:membroId
 * Atualizar membro da equipe
 */
router.put('/equipe/:membroId', verifyToken, async (req, res, next) => {
    try {
        const membro = await planejarController.atualizarEquipeMembro(parseInt(req.params.membroId), req.body, req.user.id, req.user.perfil);
        res.json(membro);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/planejar/equipe/:membroId
 * Remover membro da equipe
 */
router.delete('/equipe/:membroId', verifyToken, async (req, res, next) => {
    try {
        await planejarController.removerEquipeMembro(parseInt(req.params.membroId), req.user.id, req.user.perfil);
        res.json({ message: 'Membro da equipe removido com sucesso' });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// Plano de Projeto Endpoints
// ============================================================================

/**
 * POST /api/planejar/plano-projeto/:processoId/salvar-draft
 * Salvar plano de projeto como rascunho
 */
router.post('/plano-projeto/salvar-draft/:processoId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const plano = await planejarController.salvarPlanoProjetoDraft(processoId, req.body, req.user.id, req.user.perfil);
        res.json(plano);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/planejar/plano-projeto/:processoId
 * Obter plano de projeto
 */
router.get('/plano-projeto/:processoId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const plano = await planejarController.obterPlanoProjeto(processoId, req.user.id, req.user.perfil);
        res.json(plano);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// Checklist Endpoints
// ============================================================================

/**
 * GET /api/planejar/checklist/:processoId
 * Obter checklist de aprovação
 */
router.get('/checklist/:processoId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const checklist = await planejarController.obterChecklist(processoId, req.user.id, req.user.perfil);
        res.json(checklist);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/planejar/checklist/:checklistId
 * Atualizar item do checklist
 */
router.put('/checklist/:checklistId', verifyToken, async (req, res, next) => {
    try {
        const item = await planejarController.atualizarChecklistItem(parseInt(req.params.checklistId), req.body, req.user.id, req.user.perfil);
        res.json(item);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// Process-level attachments for Planejar (Documentação, DEIP, Plano, Ata)
// ============================================================================

/**
 * POST /api/planejar/:processoId/documentacao
 * Upload documentação existente do processo (vários arquivos permitidos via múltiplas requisições)
 */
router.post('/:processoId/documentacao', verifyToken, multerHandler, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const attachment = await attachmentController.uploadProcessAttachment(req, processoId, 'Documento');
        res.status(201).json(attachment);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/planejar/:processoId/documentacao
 */
router.get('/:processoId/documentacao', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const attachments = await attachmentController.listProcessAttachments(processoId, req.user);
        res.json({ attachments });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/planejar/:processoId/cronograma
 * Upload Anexo III — Cronograma
 */
router.post('/:processoId/cronograma', verifyToken, multerHandler, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const attachment = await attachmentController.uploadProcessAttachment(req, processoId, 'Cronograma');
        res.status(201).json(attachment);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/planejar/:processoId/cronograma
 */
router.get('/:processoId/cronograma', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const attachments = await attachmentController.listProcessAttachmentsByType(processoId, 'Cronograma', req.user);
        res.json({ attachments });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/planejar/:processoId/deip
 * Upload Anexo I (DEIP)
 */
router.post('/:processoId/deip', verifyToken, multerHandler, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const attachment = await attachmentController.uploadProcessAttachment(req, processoId, 'DEIP');
        res.status(201).json(attachment);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/planejar/:processoId/plano
 * Upload Anexo II (Plano de Projeto)
 */
router.post('/:processoId/plano', verifyToken, multerHandler, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const attachment = await attachmentController.uploadProcessAttachment(req, processoId, 'PLANO');
        res.status(201).json(attachment);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/planejar/:processoId/ata
 * Upload Ata de Validação
 */
router.post('/:processoId/ata', verifyToken, multerHandler, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const attachment = await attachmentController.uploadProcessAttachment(req, processoId, 'ATA');
        res.status(201).json(attachment);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/planejar/:processoId/anexo/:attachmentId/download
 */
router.get('/:processoId/anexo/:attachmentId/download', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const attachmentId = parseInt(req.params.attachmentId);
        const { attachment, filePath } = await attachmentController.getProcessAttachmentForDownload(req, processoId, attachmentId);
        res.setHeader('Content-Type', attachment.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.nome_arquivo.replace(/\"/g, '')}"`);
        res.sendFile(filePath);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/planejar/:processoId/anexo/:attachmentId
 */
router.delete('/:processoId/anexo/:attachmentId', verifyToken, async (req, res, next) => {
    try {
        const processoId = parseInt(req.params.processoId);
        const attachmentId = parseInt(req.params.attachmentId);
        const result = await attachmentController.deleteProcessAttachment(req, processoId, attachmentId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;

