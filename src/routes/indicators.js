// ============================================================================
// Indicator Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const indicatorController = require('../controllers/indicatorController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const legacyUserId = (req) => req.user.legacyUserId ?? req.user.id;

/**
 * GET /api/indicators
 * Listar todos os indicadores visíveis ao usuário.
 */
router.get('/', verifyToken, async (req, res, next) => {
    try {
        if (req.user.perfil === 'SETOR') {
            return res.json(await indicatorController.obterIndicadoresSetor(req.user.setor_id, legacyUserId(req), req.user.perfil));
        }

        const indicadores = await indicatorController.listarTodosIndicadores();
        res.json(indicadores);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/indicators
 * Criar indicador
 */
router.post('/', verifyToken, async (req, res, next) => {
    try {
        const indicador = await indicatorController.criarIndicador(req.body, legacyUserId(req), req.user.perfil);
        res.status(201).json(indicador);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/indicators/:id
 * Obter detalhes de um indicador
 */
router.get('/:id', verifyToken, async (req, res, next) => {
    try {
        const indicador = await indicatorController.obterIndicador(req.params.id, legacyUserId(req), req.user.perfil);

        if (!indicador) {
            return res.status(404).json({ error: 'Indicador não encontrado' });
        }

        res.json(indicador);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/indicators/:id/valor
 * Atualizar valor do indicador
 */
router.put('/:id/valor', verifyToken, async (req, res, next) => {
    try {
        const { novoValor } = req.body;

        if (novoValor === undefined) {
            return res.status(400).json({ error: 'novoValor é obrigatório' });
        }

        const indicadorAtualizado = await indicatorController.atualizarValorIndicador(
            req.params.id,
            novoValor,
            legacyUserId(req),
            req.user.perfil
        );

        res.json(indicadorAtualizado);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/indicators/setor/:setorId
 * Obter indicadores agregados por setor
 */
router.get('/setor/:setorId', verifyToken, async (req, res, next) => {
    try {
        const indicadores = await indicatorController.obterIndicadoresSetor(req.params.setorId, legacyUserId(req), req.user.perfil);
        res.json(indicadores);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
