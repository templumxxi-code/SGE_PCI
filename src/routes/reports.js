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
 * GET /api/reports/processos/pdf
 * Gerar relatório de processos em PDF
 */
router.get('/processos/pdf', verifyToken, async (req, res, next) => {
    try {
        const PDFGenerator = require('../services/pdfGenerator');
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

        // Gerar PDF
        const pdfBuffer = await PDFGenerator.gerarRelatarioProcessos(processos, totais, { data_inicio, data_fim, setor_id }, { usuario_nome: req.user.nome, perfil: req.user.perfil });

        // Enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio_processos_${new Date().getTime()}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports/indicadores/pdf
 * Gerar relatório de indicadores em PDF
 */
router.get('/indicadores/pdf', verifyToken, async (req, res, next) => {
    try {
        const PDFGenerator = require('../services/pdfGenerator');
        const { processo_id, tipo_indicador, data_inicio, data_fim } = req.query;

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

        if (data_inicio) {
            query_text += ` AND i.atualizado_em >= $${paramCount}`;
            params.push(data_inicio);
            paramCount++;
        }

        if (data_fim) {
            query_text += ` AND i.atualizado_em <= $${paramCount}`;
            params.push(data_fim);
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

        // Gerar PDF
        const pdfBuffer = await PDFGenerator.gerarRelatarioIndicadores(indicadores, totais, { data_inicio, data_fim }, { usuario_nome: req.user.nome, perfil: req.user.perfil });

        // Enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio_indicadores_${new Date().getTime()}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports/logs/pdf
 * Gerar relatório de auditoria em PDF
 */
router.get('/logs/pdf', verifyToken, async (req, res, next) => {
    try {
        const PDFGenerator = require('../services/pdfGenerator');
        const { data_inicio, data_fim } = req.query;

        let query_text = `
            SELECT l.id, l.usuario_id, u.nome AS usuario_nome, u.perfil AS usuario_perfil,
                   l.acao, l.tabela_afetada, l.id_registro, l.data_acao AS criado_em,
                   p.nome AS processo_nome, s.nome AS setor_nome
            FROM logs l
            LEFT JOIN usuarios u ON u.id = l.usuario_id
            LEFT JOIN processos p ON l.tabela_afetada = 'processos' AND p.id = l.id_registro
            LEFT JOIN setores s ON s.id = p.setor_id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (req.user.perfil === 'SETOR') {
            query_text += ` AND (u.id = $${paramCount} OR p.setor_id = $${paramCount})`;
            params.push(req.user.id);
            paramCount++;
        }

        if (data_inicio) {
            query_text += ` AND criado_em >= $${paramCount}`;
            params.push(data_inicio);
            paramCount++;
        }

        if (data_fim) {
            query_text += ` AND criado_em <= $${paramCount}`;
            params.push(data_fim);
            paramCount++;
        }

        query_text += ' ORDER BY criado_em DESC';

        const logs = await queryMany(query_text, params);

        // Gerar PDF
        const pdfBuffer = await PDFGenerator.gerarRelatarioLogs(logs, { data_inicio, data_fim }, { usuario_nome: req.user.nome, perfil: req.user.perfil });

        // Enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio_auditoria_${new Date().getTime()}.pdf"`);
        res.send(pdfBuffer);
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
        const scopeClauses = ['p.ativo = TRUE'];
        const scopeParams = [];

        if (req.user.perfil === 'SETOR') {
            scopeClauses.push('p.setor_id = $1');
            scopeParams.push(req.user.setor_id);
        } else if (setor_id) {
            scopeClauses.push('p.setor_id = $1');
            scopeParams.push(setor_id);
        }

        const scopeFilter = scopeClauses.length ? `WHERE ${scopeClauses.join(' AND ')}` : '';

        const statusQuery = `
            SELECT p.status_fase, COUNT(*) as total
            FROM processos p
            ${scopeFilter}
            GROUP BY p.status_fase
        `;
        const statusResults = await queryMany(statusQuery, scopeParams);
        const porStatus = statusResults.reduce((acc, item) => {
            acc[item.status_fase] = parseInt(item.total, 10);
            return acc;
        }, {});

        const phaseConformityQuery = `
            SELECT p.status_fase,
                   AVG(COALESCE(p.percentual_conclusao, 0)) as average_conformity
            FROM processos p
            ${scopeFilter}
            GROUP BY p.status_fase
        `;
        const phaseConformityResults = await queryMany(phaseConformityQuery, scopeParams);
        const porFaseConformidade = phaseConformityResults.reduce((acc, item) => {
            acc[item.status_fase] = Math.round(parseFloat(item.average_conformity) || 0);
            return acc;
        }, {});

        const attentionQuery = `
            SELECT p.id, p.nome, p.status_fase, p.percentual_conclusao, s.nome as setor_nome
            FROM processos p
            LEFT JOIN setores s ON p.setor_id = s.id
            ${scopeFilter}
            ORDER BY COALESCE(p.percentual_conclusao, 0) ASC, p.criado_em DESC
            LIMIT 5
        `;
        const attentionProcesses = await queryMany(attentionQuery, scopeParams);

        let checklistSummary = { total_processos: 0, total_itens: 0, concluidas: 0 };
        try {
            const checklistSummaryQuery = `
                SELECT
                    COUNT(p.id) AS total_processos,
                    COALESCE(SUM(
                        CASE
                            WHEN jsonb_typeof(COALESCE(pl.checklist, '[]'::jsonb)) = 'array'
                                THEN jsonb_array_length(COALESCE(pl.checklist, '[]'::jsonb))
                            ELSE 0
                        END
                    ), 0) AS total_itens,
                    COALESCE(SUM(
                        CASE
                            WHEN jsonb_typeof(COALESCE(pl.checklist, '[]'::jsonb)) = 'array'
                                THEN (
                                    SELECT COUNT(*)
                                    FROM jsonb_array_elements(COALESCE(pl.checklist, '[]'::jsonb)) AS item
                                    WHERE COALESCE((item->>'concluido')::boolean, false)
                                )
                            ELSE 0
                        END
                    ), 0) AS concluidas
                FROM processos p
                LEFT JOIN planejar pl ON pl.processo_id = p.id
                ${scopeFilter}
            `;
            const checklistSummaryResults = await queryMany(checklistSummaryQuery, scopeParams);
            checklistSummary = checklistSummaryResults[0] || checklistSummary;
        } catch (error) {
            console.warn('Checklist do dashboard indisponível; usando zeros.', error.message);
        }

        const totalChecklistItens = parseInt(checklistSummary.total_itens || 0, 10);
        const checklistConcluidas = parseInt(checklistSummary.concluidas || 0, 10);
        const checklistPendentes = Math.max(totalChecklistItens - checklistConcluidas, 0);
        const checklistConformidadeMedia = totalChecklistItens > 0
            ? Math.min(100, Math.round((checklistConcluidas / totalChecklistItens) * 100))
            : 0;

        const indicatorsQuery = `
            SELECT AVG(
                CASE WHEN i.valor_meta > 0 THEN (i.valor_atual / i.valor_meta) * 100 ELSE 0 END
            ) as conformidade_media,
            COUNT(*) as total_indicadores
            FROM indicadores i
            INNER JOIN processos p ON i.processo_id = p.id
            ${scopeFilter}
        `;
        const indicatorsResults = await queryMany(indicatorsQuery, scopeParams);
        const conformitéMediaFromIndicators = Math.round(indicatorsResults[0]?.conformidade_media || 0);
        const totalIndicadores = parseInt(indicatorsResults[0]?.total_indicadores || 0, 10);

        const activitySummary = {
            total: totalChecklistItens,
            concluidas: checklistConcluidas,
            pendentes: checklistPendentes,
            atrasadas: 0
        };

        const processProgressQuery = `
            SELECT
                COUNT(*) FILTER (WHERE COALESCE(p.percentual_conclusao, 0) >= 100) as concluido,
                COUNT(*) FILTER (WHERE COALESCE(p.percentual_conclusao, 0) > 0 AND COALESCE(p.percentual_conclusao, 0) < 100) as em_andamento,
                COUNT(*) FILTER (WHERE COALESCE(p.percentual_conclusao, 0) = 0) as pendente
            FROM processos p
            ${scopeFilter}
        `;
        const progressResults = await queryMany(processProgressQuery, scopeParams);
        const progressSummary = progressResults[0] || { concluido: 0, em_andamento: 0, pendente: 0 };

        const temporalQuery = `
            SELECT
                TO_CHAR(DATE_TRUNC('week', p.criado_em), 'DD/MM/YYYY') as periodo,
                COUNT(*) as total,
                AVG(COALESCE(p.percentual_conclusao, 0)) as average_conformity
            FROM processos p
            ${scopeFilter}
            GROUP BY DATE_TRUNC('week', p.criado_em)
            ORDER BY DATE_TRUNC('week', p.criado_em) DESC
            LIMIT 6
        `;
        const temporalResults = await queryMany(temporalQuery, scopeParams);
        const temporal = (temporalResults || []).reverse().map((row) => ({
            periodo: row.periodo,
            total: parseInt(row.total, 10),
            averageConformity: Math.round(parseFloat(row.average_conformity) || 0)
        }));

        res.json({
            processos: {
                porStatus,
                total: Object.values(porStatus).reduce((sum, value) => sum + value, 0),
                porFaseConformidade,
                atencao: attentionProcesses.map((processo) => ({
                    id: processo.id,
                    nome: processo.nome,
                    setor_nome: processo.setor_nome || 'Não informado',
                    status_fase: processo.status_fase || 'Não informado',
                    percentual_conclusao: Number(processo.percentual_conclusao || 0)
                }))
            },
            indicadores: {
                conformidadeMedia: Math.min(100, Math.max(checklistConformidadeMedia, conformidadeMediaFromIndicators || 0)),
                total: totalIndicadores
            },
            atividades: {
                total: parseInt(activitySummary.total, 10),
                concluidas: parseInt(activitySummary.concluidas, 10),
                pendentes: parseInt(activitySummary.pendentes, 10),
                atrasadas: parseInt(activitySummary.atrasadas, 10)
            },
            progresso: {
                porStatus: {
                    concluido: parseInt(progressSummary.concluido, 10),
                    emAndamento: parseInt(progressSummary.em_andamento, 10),
                    pendente: parseInt(progressSummary.pendente, 10)
                }
            },
            evolucao: {
                temporal
            },
            dataGeracao: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/processes/:id/pop
 * Gerar Procedimento Operacional Padrão (POP) em PDF
 */
router.post('/processes/:id/pop', verifyToken, async (req, res, next) => {
    try {
        console.log('[POP] Iniciando geração de Procedimento Operacional Padrão');
        const POPGenerator = require('../services/popGenerator');
        
        const rawProcessId = String(req.params.id || '');
        const processoId = /^\d+$/.test(rawProcessId) ? parseInt(rawProcessId, 10) : rawProcessId;
        
        // Usar os dados enviados no body ou procurar no banco
        let processo = req.body.processo;
        
        if (!processo) {
            // Buscar processo no banco de dados
            const processoQuery = `
                SELECT p.id, p.nome, p.setor_id, s.nome as setor_nome,
                       p.macroprocesso_id, m.nome as macroprocesso_nome,
                       p.status_fase, p.percentual_conclusao,
                       p.data_inicio, p.data_fim, p.responsavel_id,
                       u.nome as responsavel_nome, p.criado_em, p.versao, p.objetivo
                FROM processos p
                LEFT JOIN setores s ON p.setor_id = s.id
                LEFT JOIN macroprocessos m ON p.macroprocesso_id = m.id
                LEFT JOIN usuarios u ON p.responsavel_id = u.id
                WHERE p.id = $1
            `;
            
            const processosResult = await queryMany(processoQuery, [processoId]);
            
            if (!processosResult || processosResult.length === 0) {
                return res.status(404).json({ error: 'Processo não encontrado' });
            }
            
            processo = processosResult[0];
        }
        
        // Verificar permissão
        if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        console.log(`[POP] Processo encontrado: ${processo.nome}`);

        // Buscar atividades do processo
        const atividadesQuery = typeof processoId === 'number'
            ? `
                SELECT a.id, a.processo_id, a.fase, a.codigo, a.descricao, a.dados
                FROM atividades a
                WHERE a.processo_id = $1
                ORDER BY a.fase, a.codigo
            `
            : `
                SELECT a.id, ph.process_id AS processo_id, ph.phase_name AS fase,
                       a.activity_code AS codigo, a.description AS descricao,
                       '{}'::jsonb AS dados
                FROM process_activities a
                JOIN process_phases ph ON ph.id = a.phase_id
                WHERE ph.process_id = $1
                ORDER BY ph.phase_order, a.created_at
            `;

        const atividadesResult = await queryMany(atividadesQuery, [processoId]);
        console.log(`[POP] Atividades encontradas: ${atividadesResult ? atividadesResult.length : 0}`);

        // Organizar dados por atividade
        const dadosAtividades = {};
        if (atividadesResult) {
            atividadesResult.forEach(a => {
                dadosAtividades[a.codigo] = a.dados || {};
            });
        }

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
