// ============================================================================
// Process Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const processController = require('../controllers/processController');
const indicatorController = require('../controllers/indicatorController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/processes
 * Listar processos (com filtros)
 */
router.get('/', verifyToken, async (req, res, next) => {
    try {
        const filtros = {
            setor_id: req.query.setor_id ? parseInt(req.query.setor_id) : null,
            macroprocesso_id: req.query.macroprocesso_id ? parseInt(req.query.macroprocesso_id) : null,
            status_fase: req.query.status_fase || null,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20
        };

        const processos = await processController.listarProcessos(filtros, req.user.legacyUserId, req.user.perfil);
        res.json(processos);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/processes/:id
 * Obter detalhes de um processo
 */
router.get('/:id', verifyToken, async (req, res, next) => {
    try {
        const processo = await processController.obterProcesso(req.params.id, req.user.legacyUserId, req.user.perfil);

        if (!processo) {
            return res.status(404).json({ error: 'Processo não encontrado' });
        }

        res.json(processo);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/processes
 * Criar novo processo
 */
router.post('/', verifyToken, async (req, res, next) => {
    try {
        const processo = await processController.criarProcesso(req.body, req.user.legacyUserId, req.user.perfil);
        res.status(201).json(processo);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/processes/:id
 * Atualizar processo
 */
router.put('/:id', verifyToken, async (req, res, next) => {
    try {
        const processoAtualizado = await processController.atualizarProcesso(req.params.id, req.body, req.user.legacyUserId, req.user.perfil);
        res.json(processoAtualizado);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/processes/:id
 * Deletar processo (requer confirmação de senha do usuário no corpo: { senha })
 */
router.delete('/:id', verifyToken, async (req, res, next) => {
    try {
        const { isGlobalAdmin } = require('../services/roles');
        const senha = req.body && req.body.senha ? String(req.body.senha) : null;

        // Administradores globais podem remover sem senha; demais usuários exigem confirmação
        if (!isGlobalAdmin(req.user.perfil)) {
            if (!senha) return res.status(400).json({ error: 'Senha é obrigatória para remoção' });

            // Verificar senha do usuário atual contra o hash no banco
            const bcryptjs = require('bcryptjs');
            const { queryOne } = require('../models/db');
            const userRow = await queryOne('SELECT password_hash FROM usuarios WHERE id = $1', [req.user.legacyUserId]);
            const hash = userRow ? userRow.password_hash || userRow.passwordHash || null : null;
            const senhaValida = hash ? await bcryptjs.compare(String(senha), hash) : false;
            if (!senhaValida) return res.status(403).json({ error: 'Senha inválida' });
        }

        const motivo = req.body && req.body.motivo ? String(req.body.motivo).slice(0, 1000) : null;
        const resultado = await processController.deletarProcesso(req.params.id, req.user.legacyUserId, req.user.perfil, motivo);
        res.json(resultado);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/processes/:id/indicadores
 * Listar indicadores de um processo
 */
router.get('/:id/indicadores', verifyToken, async (req, res, next) => {
    try {
        const indicadores = await indicatorController.listarIndicadores(req.params.id, req.user.legacyUserId, req.user.perfil);
        res.json(indicadores);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/processes/estatisticas/geral
 * Obter estatísticas de processos
 */
router.get('/estatisticas/geral', verifyToken, async (req, res, next) => {
    try {
        const setorId = req.query.setor_id ? parseInt(req.query.setor_id) : null;
        const estatisticas = await processController.obterEstatisticas(setorId, req.user.legacyUserId, req.user.perfil);
        res.json(estatisticas);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
