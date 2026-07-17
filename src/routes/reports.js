// ============================================================================
// Report Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { queryMany } = require('../models/db');

/**
 * GET /api/reports/processos
 * Gerar relatório de processos
 */
router.get('/processos', verifyToken, async (req, res, next) => {
    try {
        const { setor_id, macroprocesso_id, status_fase, data_inicio, data_fim } = req.query;

        let query_text = `
            SELECT p.id, p.nome, p.setor_id, s.nome as setor_nome,
                   p.macroprocesso_id, m.nome as macroprocesso_nome,
                   p.status_fase, p.percentual_conclusao,
                   p.data_inicio, p.data_fim, p.responsavel_id,
                   u.nome as responsavel_nome, p.criado_em
            FROM processos p
            LEFT JOIN setores s ON p.setor_id = s.id
            LEFT JOIN macroprocessos m ON p.macroprocesso_id = m.id
            LEFT JOIN usuarios u ON p.responsavel_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (req.user.perfil === 'SETOR') {
            query_text += ` AND p.setor_id = $${paramCount}`;
            params.push(req.user.setor_id);
            paramCount++;
        } else if (setor_id) {
            query_text += ` AND p.setor_id = $${paramCount}`;
            params.push(setor_id);
            paramCount++;
        }

        if (macroprocesso_id) {
            query_text += ` AND p.macroprocesso_id = $${paramCount}`;
            params.push(macroprocesso_id);
            paramCount++;
        }

        if (status_fase) {
            query_text += ` AND p.status_fase = $${paramCount}`;
            params.push(status_fase);
            paramCount++;
        }

        if (data_inicio) {
            query_text += ` AND p.data_inicio >= $${paramCount}`;
            params.push(data_inicio);
            paramCount++;
        }

        if (data_fim) {
            query_text += ` AND p.data_fim <= $${paramCount}`;
            params.push(data_fim);
            paramCount++;
        }

        query_text += ' ORDER BY p.criado_em DESC';

        const processos = await queryMany(query_text, params);

        // Calcular totais
        const totais = {
            total: processos.length,
            porStatus: {},
            percentualMedioConformidade: 0
        };

        processos.forEach(p => {
            totais.porStatus[p.status_fase] = (totais.porStatus[p.status_fase] || 0) + 1;
            totais.percentualMedioConformidade += p.percentual_conclusao;
        });

        if (processos.length > 0) {
            totais.percentualMedioConformidade /= processos.length;
        }

        res.json({
            dados: processos,
            resumo: totais,
            dataGeracao: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports/indicadores
 * Gerar relatório de indicadores
 */
router.get('/indicadores', verifyToken, async (req, res, next) => {
    try {
        const { processo_id, tipo_indicador } = req.query;

        let query_text = `
            SELECT i.*, p.nome as processo_nome, m.nome as macroprocesso_nome
            FROM indicadores i
            LEFT JOIN processos p ON i.processo_id = p.id
            LEFT JOIN macroprocessos m ON p.macroprocesso_id = m.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (req.user.perfil === 'SETOR') {
            query_text += ` AND p.setor_id = $${paramCount}`;
            params.push(req.user.setor_id);
            paramCount++;
        }

        if (processo_id) {
            query_text += ` AND i.processo_id = $${paramCount}`;
            params.push(processo_id);
            paramCount++;
        }

        if (tipo_indicador) {
            query_text += ` AND i.tipo_indicador = $${paramCount}`;
            params.push(tipo_indicador);
            paramCount++;
        }

        query_text += ' ORDER BY i.atualizado_em DESC';

        const indicadores = await queryMany(query_text, params);

        // Calcular totais
        const totais = {
            total: indicadores.length,
            porTipo: {},
            conformidadeMedia: 0
        };

        indicadores.forEach(i => {
            totais.porTipo[i.tipo_indicador] = (totais.porTipo[i.tipo_indicador] || 0) + 1;
            if (i.valor_meta > 0) {
                totais.conformidadeMedia += (i.valor_atual / i.valor_meta) * 100;
            }
        });

        if (indicadores.length > 0) {
            totais.conformidadeMedia /= indicadores.length;
            totais.conformidadeMedia = Math.min(totais.conformidadeMedia, 100);
        }

        res.json({
            dados: indicadores,
            resumo: totais,
            dataGeracao: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports/dashboard
 * Gerar dados para dashboard
 */
router.get('/dashboard', verifyToken, async (req, res, next) => {
    try {
        const { setor_id } = req.query;

        let statusQuery = 'SELECT status_fase, COUNT(*) as total FROM processos';
        const statusParams = [];

        if (req.user.perfil === 'SETOR') {
            statusQuery += ' WHERE setor_id = $1';
            statusParams.push(req.user.setor_id);
        } else if (setor_id) {
            statusQuery += ' WHERE setor_id = $1';
            statusParams.push(setor_id);
        }

        statusQuery += ' GROUP BY status_fase';

        const porStatus = await queryMany(statusQuery, statusParams);

        // Conformidade média
        let conformidadeQuery = `
            SELECT AVG(
                CASE 
                    WHEN i.valor_meta > 0 THEN (i.valor_atual / i.valor_meta) * 100
                    ELSE 0
                END
            ) as conformidade_media
            FROM indicadores i
            INNER JOIN processos p ON i.processo_id = p.id
        `;
        const conformidadeParams = [];

        if (req.user.perfil === 'SETOR') {
            conformidadeQuery += ' WHERE p.setor_id = $1';
            conformidadeParams.push(req.user.setor_id);
        } else if (setor_id) {
            conformidadeQuery += ' WHERE p.setor_id = $1';
            conformidadeParams.push(setor_id);
        }

        const conformidade = await queryMany(conformidadeQuery, conformidadeParams);

        res.json({
            processos: {
                porStatus: porStatus,
                total: porStatus.reduce((sum, item) => sum + parseInt(item.total), 0)
            },
            indicadores: {
                conformidadeMedia: Math.round(conformidade[0]?.conformidade_media || 0)
            },
            dataGeracao: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
