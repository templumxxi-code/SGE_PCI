const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { getUserScope } = require('../middleware/scopeAccess');
const { query } = require('../models/db');

const router = express.Router();
const filters = (scope, queryParams, params) => {
    const clauses = [];
    if (!scope.global) { params.push(scope.unitIds); clauses.push(`p.organizational_unit_id = ANY($${params.length}::uuid[])`); }
    if (queryParams.status) { params.push(queryParams.status); clauses.push(`p.status = $${params.length}`); }
    if (queryParams.phase) { params.push(queryParams.phase); clauses.push(`p.current_phase = $${params.length}`); }
    if (queryParams.responsible_user_id) { params.push(queryParams.responsible_user_id); clauses.push(`p.responsible_user_id = $${params.length}`); }
    if (queryParams.unit_id && scope.global) { params.push(queryParams.unit_id); clauses.push(`p.organizational_unit_id = $${params.length}`); }
    if (queryParams.data_inicio) { params.push(queryParams.data_inicio); clauses.push(`p.created_at >= $${params.length}::date`); }
    if (queryParams.data_fim) { params.push(queryParams.data_fim); clauses.push(`p.created_at < ($${params.length}::date + INTERVAL '1 day')`); }
    return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
};

router.get('/process-summary', verifyToken, authorize({ permissions: ['PROCESS_VIEW'] }), async (req, res, next) => {
    try {
        const scope = await getUserScope(req.user); const params = []; const where = filters(scope, req.query, params);
        const rows = await query(`SELECT p.status, p.current_phase, COUNT(*)::int AS total, ROUND(AVG(p.progress_percent),2) AS progress FROM processes p ${where} GROUP BY p.status,p.current_phase ORDER BY p.status,p.current_phase`, params);
        res.json({ generated_at: new Date().toISOString(), data: rows.rows });
    } catch (error) { next(error); }
});

router.get('/unit-performance', verifyToken, authorize({ permissions: ['PROCESS_VIEW'] }), async (req, res, next) => {
    try {
        const scope = await getUserScope(req.user); const params = []; const where = filters(scope, req.query, params);
        const rows = await query(`SELECT p.organizational_unit_id AS unit_id, ou.nome AS unit_name, COUNT(*)::int AS total_processos, ROUND(AVG(p.progress_percent),2) AS progresso_medio FROM processes p JOIN organizational_units_v2 ou ON ou.id=p.organizational_unit_id ${where} GROUP BY p.organizational_unit_id,ou.nome ORDER BY ou.nome`, params);
        res.json({ generated_at: new Date().toISOString(), data: rows.rows });
    } catch (error) { next(error); }
});

router.get('/activity-performance', verifyToken, authorize({ permissions: ['PROCESS_VIEW'] }), async (req, res, next) => {
    try {
        const scope = await getUserScope(req.user); const params = []; const where = filters(scope, req.query, params);
        const rows = await query(`SELECT a.status, COUNT(*)::int AS total FROM process_activities a JOIN process_phases ph ON ph.id=a.phase_id JOIN processes p ON p.id=ph.process_id ${where} GROUP BY a.status ORDER BY a.status`, params);
        res.json({ generated_at: new Date().toISOString(), data: rows.rows });
    } catch (error) { next(error); }
});

module.exports = router;
