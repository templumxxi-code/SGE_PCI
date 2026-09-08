const crypto = require('crypto');
const { query, queryOne } = require('../../models/db');
const { getUserScope } = require('../../middleware/scopeAccess');

const newId = () => crypto.randomUUID();

const ensureProcessV2Mirror = async (processId) => {
    const existing = await queryOne('SELECT id FROM processes_v2 WHERE id=$1', [processId]);
    if (existing) return existing;

    const legacy = await queryOne(
        'SELECT id, name, description, organizational_unit_id, created_by, responsible_user_id, current_phase, status FROM processes WHERE id=$1',
        [processId]
    );
    if (!legacy) return null;

    const statusMap = {
        DRAFT: 'EM_ELABORACAO',
        ACTIVE: 'EM_ANDAMENTO',
        COMPLETED: 'HOMOLOGADO',
        CANCELLED: 'DEVOLVIDO'
    };
    return queryOne(
        `INSERT INTO processes_v2 (id, nome, descricao, organizational_unit_id, created_by, responsible_user_id, current_phase, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [legacy.id, legacy.name, legacy.description, legacy.organizational_unit_id, legacy.created_by, legacy.responsible_user_id, legacy.current_phase, statusMap[legacy.status] || 'EM_ELABORACAO']
    );
};

const scopedWhere = (scope, params, column = 'p.organizational_unit_id') => {
    if (scope.global) return '';
    params.push(scope.unitIds);
    return ` AND ${column} = ANY($${params.length}::uuid[])`;
};

const createProcess = async (data, user) => {
    const scope = await getUserScope(user);
    if (!scope.global && !scope.unitIds.includes(data.organizationalUnitId)) throw new Error('Unidade fora do escopo');
    const id = newId();
    await query(`INSERT INTO processes (id, name, description, organizational_unit_id, created_by, responsible_user_id, status, current_phase)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, data.name, data.description || null, data.organizationalUnitId, user.id, data.responsibleUserId || null, data.status || 'DRAFT', data.currentPhase || 'PLAN']);
    await query(`INSERT INTO processes_v2 (id, nome, descricao, organizational_unit_id, created_by, responsible_user_id, current_phase, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'EM_ELABORACAO')`, [id, data.name, data.description || null, data.organizationalUnitId, user.id, data.responsibleUserId || null, data.currentPhaseName || 'Planejar']);
    return findProcessById(id, user);
};

const findProcesses = async (user, filters = {}) => {
    const scope = await getUserScope(user);
    const params = [];
    let sql = 'SELECT p.* FROM processes p WHERE TRUE';
    sql += scopedWhere(scope, params);
    if (filters.status) { params.push(filters.status); sql += ` AND p.status = $${params.length}`; }
    sql += ' ORDER BY p.created_at DESC';
    return (await query(sql, params)).rows;
};

const findProcessById = async (id, user) => {
    const scope = await getUserScope(user);
    const params = [id];
    let sql = 'SELECT p.* FROM processes p WHERE p.id = $1';
    sql += scopedWhere(scope, params);
    const process = await queryOne(sql, params);
    if (!process) return null;
    const phases = (await query('SELECT * FROM process_phases WHERE process_id=$1 ORDER BY COALESCE(phase_order, order_number)', [id])).rows;
    for (const phase of phases) {
        phase.activities = (await query('SELECT * FROM process_activities WHERE phase_id=$1 ORDER BY created_at', [phase.id])).rows;
        for (const activity of phase.activities) {
            activity.checklist = (await query('SELECT * FROM activity_checklists WHERE activity_id=$1 ORDER BY created_at', [activity.id])).rows;
        }
    }
    process.phases = phases;
    return process;
};

const updateProcess = async (id, data, user) => {
    const current = await findProcessById(id, user);
    if (!current) return null;
    const result = await queryOne(`UPDATE processes SET name=COALESCE($2,name), description=COALESCE($3,description),
        responsible_user_id=COALESCE($4,responsible_user_id), status=COALESCE($5,status), current_phase=COALESCE($6,current_phase), progress_percent=COALESCE($7,progress_percent), updated_at=CURRENT_TIMESTAMP
        WHERE id=$1 RETURNING *`, [id, data.name || null, data.description || null, data.responsibleUserId || null, data.status || null, data.currentPhase || null, data.progressPercent === undefined ? null : Number(data.progressPercent)]);
    return result;
};

const deleteProcess = async (id, user) => {
    const current = await findProcessById(id, user);
    if (!current) return null;
    return queryOne('UPDATE processes SET status=\'CANCELLED\', updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *', [id]);
};

module.exports = { createProcess, findProcesses, findProcessById, updateProcess, deleteProcess, ensureProcessV2Mirror };