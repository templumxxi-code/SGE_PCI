const activityRepository = require('../../repositories/bpm/activityRepository');
const userRepository = require('../../repositories/userRepository');
const { getUserScope } = require('../../middleware/scopeAccess');
const { getPhaseContext, getActivityContext, invalidUuid, httpError, audit } = require('./access');

const create = async (req, res, next) => {
    try {
        if (invalidUuid(req.params.phaseId)) throw httpError('UUID de fase inválido', 400);
        const { phase, process } = await getPhaseContext(req.params.phaseId, req.user);
        const title = String(req.body?.title || '').trim();
        if (!title) throw httpError('title é obrigatório', 400);
        const responsibleUserId = req.body?.responsible_user_id || null;
        if (responsibleUserId) {
            const responsible = await userRepository.findUserById(responsibleUserId);
            if (!responsible) throw httpError('Responsável não encontrado', 404);
            const scope = await getUserScope(req.user);
            if (!scope.global && !scope.unitIds.includes(responsible.organizationUnitId)) throw httpError('Responsável fora do escopo', 403);
        }
        const activity = await activityRepository.createActivity({
            phaseId: phase.id,
            activityCode: req.body?.activity_code || `ACT-${Date.now()}`,
            title,
            description: req.body?.description,
            responsibleUserId,
            status: req.body?.status || 'PENDENTE'
        });
        await audit(req.user.id, 'ACTIVITY_CREATED', 'activity', activity.id, req, { processId: process.id, phaseId: phase.id });
        res.status(201).json(activity);
    } catch (error) { next(error); }
};

const listByPhase = async (req, res, next) => {
    try { await getPhaseContext(req.params.id, req.user); res.json(await activityRepository.getActivities(req.params.id)); }
    catch (error) { next(error); }
};

const get = async (req, res, next) => {
    try { const { activity, process } = await getActivityContext(req.params.id, req.user); await audit(req.user.id, 'ACTIVITY_VIEWED', 'activity', activity.id, req, { processId: process.id }); res.json(activity); }
    catch (error) { next(error); }
};

const update = async (req, res, next) => {
    try {
        if (invalidUuid(req.params.id)) throw httpError('UUID inválido', 400);
        const { activity, process } = await getActivityContext(req.params.id, req.user);
        const updated = await activityRepository.updateActivity(activity.id, { title: req.body?.title, description: req.body?.description, status: req.body?.status });
        await audit(req.user.id, 'ACTIVITY_UPDATED', 'activity', updated.id, req, { processId: process.id });
        res.json(updated);
    } catch (error) { next(error); }
};

module.exports = { create, listByPhase, get, update };
