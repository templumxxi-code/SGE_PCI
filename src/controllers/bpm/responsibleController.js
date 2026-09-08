const userRepository = require('../../repositories/userRepository');
const responsibleRepository = require('../../repositories/bpm/responsibleRepository');
const { getUserScope } = require('../../middleware/scopeAccess');
const { getActivityContext, invalidUuid, httpError, audit } = require('./access');

const add = async (req, res, next) => {
    try {
        const { activity, process } = await getActivityContext(req.params.id, req.user);
        const user = await userRepository.findUserById(req.body?.user_id);
        if (!user) throw httpError('Usuário não encontrado', 404);
        const scope = await getUserScope(req.user);
        if (!scope.global && !scope.unitIds.includes(user.organizationUnitId)) throw httpError('Responsável fora do escopo', 403);
        const result = await responsibleRepository.addResponsible(activity.id, user.id, req.user.id);
        await audit(req.user.id, 'RESPONSIBLE_ASSIGNED', 'activity', activity.id, req, { processId: process.id, userId: user.id });
        res.status(201).json(result);
    } catch (error) { next(error); }
};

const remove = async (req, res, next) => {
    try {
        const { activity } = await getActivityContext(req.params.id, req.user);
        if (invalidUuid(req.params.userId)) throw httpError('UUID inválido', 400);
        const result = await responsibleRepository.removeResponsible(activity.id, req.params.userId);
        if (!result) throw httpError('Responsável não encontrado', 404);
        await audit(req.user.id, 'RESPONSIBLE_REMOVED', 'activity', activity.id, req, { userId: req.params.userId });
        res.status(204).end();
    } catch (error) { next(error); }
};

const list = async (req, res, next) => {
    try { await getActivityContext(req.params.id, req.user); res.json(await responsibleRepository.getResponsibles(req.params.id)); }
    catch (error) { next(error); }
};

module.exports = { add, remove, list };
