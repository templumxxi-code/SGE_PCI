const { query, queryOne } = require('../../models/db');
const processRepository = require('../../repositories/bpm/processRepository');
const phaseRepository = require('../../repositories/bpm/phaseRepository');
const activityRepository = require('../../repositories/bpm/activityRepository');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalidUuid = (value) => !UUID_PATTERN.test(String(value || ''));
const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const getProcess = async (id, user) => {
    if (invalidUuid(id)) throw httpError('UUID inválido', 400);
    const process = await processRepository.findProcessById(id, user);
    if (!process) throw httpError('Processo não encontrado ou fora do escopo', 404);
    return process;
};

const getPhaseContext = async (id, user) => {
    if (invalidUuid(id)) throw httpError('UUID inválido', 400);
    const phase = await phaseRepository.getPhaseById(id);
    if (!phase) throw httpError('Fase não encontrada', 404);
    const process = await getProcess(phase.process_id, user);
    return { phase, process };
};

const getActivityContext = async (id, user) => {
    if (invalidUuid(id)) throw httpError('UUID inválido', 400);
    const activity = await activityRepository.getActivityById(id);
    if (!activity) throw httpError('Atividade não encontrada', 404);
    const { phase, process } = await getPhaseContext(activity.phase_id, user);
    return { activity, phase, process };
};

const audit = async (userId, action, entity, entityId, request, data = {}) => {
    await query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, new_data, ip)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId || null, action, entity, entityId || null, JSON.stringify(data), request?.ip || null]
    ).catch(() => {});
};

module.exports = { UUID_PATTERN, invalidUuid, httpError, getProcess, getPhaseContext, getActivityContext, audit };
