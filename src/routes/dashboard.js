const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { getUserScope } = require('../middleware/scopeAccess');
const { queryOne, query } = require('../models/db');

const router = express.Router();
const scopedProcessWhere = (scope, params) => {
    if (scope.global) return '';
    params.push(scope.unitIds);
    return ` AND p.organizational_unit_id = ANY($${params.length}::uuid[])`;
};

const dashboardFilters = (scope, queryParams, params) => {
    const clauses = ["p.status <> 'CANCELLED'"];
    if (!scope.global) {
        params.push(scope.unitIds);
        clauses.push(`p.organizational_unit_id = ANY($${params.length}::uuid[])`);
    } else if (queryParams.unit_id) {
        params.push(queryParams.unit_id);
        clauses.push(`p.organizational_unit_id = $${params.length}`);
    }
    if (queryParams.status) { params.push(queryParams.status); clauses.push(`p.status = $${params.length}`); }
    if (queryParams.phase) { params.push(queryParams.phase); clauses.push(`p.current_phase = $${params.length}`); }
    if (queryParams.responsible_user_id) { params.push(queryParams.responsible_user_id); clauses.push(`p.responsible_user_id = $${params.length}`); }
    if (queryParams.data_inicio) { params.push(queryParams.data_inicio); clauses.push(`p.created_at >= $${params.length}::date`); }
    if (queryParams.data_fim) { params.push(queryParams.data_fim); clauses.push(`p.created_at < ($${params.length}::date + INTERVAL '1 day')`); }
    return clauses.join(' AND ');
};

const summary = async (req, res, next) => {
    try {
        const scope = await getUserScope(req.user);
        const params = [];
        const filter = ` AND ${dashboardFilters(scope, req.query, params)}`;
        const row = await queryOne(`SELECT COUNT(*)::int AS total_processos,
            COUNT(*) FILTER (WHERE status='ACTIVE')::int AS processos_em_andamento,
            COUNT(*) FILTER (WHERE status='COMPLETED')::int AS processos_concluidos,
            COUNT(*) FILTER (WHERE status NOT IN ('COMPLETED','CANCELLED') AND updated_at < CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS processos_atrasados,
            COALESCE(AVG(progress_percent),0)::numeric(5,2) AS progresso_medio
            FROM processes p WHERE TRUE${filter}`, params);
        const activities = await queryOne(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE a.status='PENDING')::int AS pendentes,
            COUNT(*) FILTER (WHERE a.status IN ('COMPLETED','CONCLUIDA'))::int AS concluidas,
            COUNT(*) FILTER (WHERE a.status NOT IN ('COMPLETED','CONCLUIDA') AND a.updated_at < CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS atrasadas
            FROM process_activities a JOIN process_phases ph ON ph.id=a.phase_id JOIN processes p ON p.id=ph.process_id
            WHERE TRUE${filter}`, params);
        res.json({ ...row, processos_atrasados: row.processos_atrasados || 0, atividades_pendentes: activities.pendentes, atividades_concluidas: activities.concluidas, atividades_atrasadas: activities.atrasadas });
    } catch (error) { next(error); }
};

const detail = async (req, res, next) => {
    try {
        const scope = await getUserScope(req.user);
        const params = [];
        const filter = ` AND ${dashboardFilters(scope, req.query, params)}`;
        const processes = (await query(`SELECT p.id, p.name, p.status, p.current_phase, p.progress_percent, p.organizational_unit_id, ou.nome AS unit_name
            FROM processes p LEFT JOIN organizational_units_v2 ou ON ou.id=p.organizational_unit_id
            WHERE TRUE${filter} ORDER BY p.updated_at DESC`, params)).rows;
        const stats = await summaryData(scope, req.query);
        const porStatus = {};
        processes.forEach((process) => { porStatus[process.status] = (porStatus[process.status] || 0) + 1; });
        const activityParams = [];
        const activityFilter = ` AND ${dashboardFilters(scope, req.query, activityParams)}`;
        const activityStats = (await queryOne(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE a.status='PENDING')::int AS pendentes, COUNT(*) FILTER (WHERE a.status IN ('COMPLETED','CONCLUIDA'))::int AS concluidas, COUNT(*) FILTER (WHERE a.status NOT IN ('COMPLETED','CONCLUIDA') AND a.updated_at < CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS atrasadas FROM process_activities a JOIN process_phases ph ON ph.id=a.phase_id JOIN processes p ON p.id=ph.process_id WHERE TRUE${activityFilter}`, activityParams));
        const indicators = await queryOne(`SELECT COUNT(*)::int AS total, COALESCE(AVG(CASE WHEN target > 0 THEN LEAST(100, current_value / target * 100) END), 0)::numeric(5,2) AS conformidade_media FROM process_indicators i JOIN processes p ON p.id=i.process_id WHERE TRUE${activityFilter}`, activityParams);
        res.json({ processos: { total: stats.total_processos, porStatus, atencao: [], lista: processes }, atividades: { total: activityStats.total, pendentes: activityStats.pendentes, concluidas: activityStats.concluidas, atrasadas: activityStats.atrasadas }, progresso: { progresso_medio: stats.progresso_medio }, indicadores: { total: indicators.total, conformidadeMedia: indicators.conformidade_media }, dataGeracao: new Date().toISOString() });
    } catch (error) { next(error); }
};

const summaryData = async (scope, queryParams = {}) => {
    const params = [];
    const filter = ` AND ${dashboardFilters(scope, queryParams, params)}`;
    const row = await queryOne(`SELECT COUNT(*)::int AS total_processos,
        COUNT(*) FILTER (WHERE status='ACTIVE')::int AS processos_em_andamento,
        COUNT(*) FILTER (WHERE status='COMPLETED')::int AS processos_concluidos,
        COALESCE(AVG(progress_percent),0)::numeric(5,2) AS progresso_medio FROM processes p WHERE TRUE${filter}`, params);
    return row;
};

router.get('/summary', verifyToken, authorize({ permissions: ['PROCESS_VIEW'] }), summary);
router.get('/nge', verifyToken, authorize({ permissions: ['DASHBOARD_GLOBAL'] }), detail);
router.get('/unit', verifyToken, authorize({ permissions: ['PROCESS_VIEW'] }), detail);

module.exports = router;