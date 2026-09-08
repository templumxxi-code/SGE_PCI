const indicatorRepository = require('../../repositories/bpm/indicatorRepository');
const { getProcess, getActivityContext, invalidUuid, httpError, audit } = require('./access');

const list = async (req, res, next) => {
    try { await getProcess(req.params.id, req.user); res.json(await indicatorRepository.getIndicators(req.params.id)); }
    catch (error) { next(error); }
};

const create = async (req, res, next) => {
    try {
        const process = await getProcess(req.params.id, req.user);
        if (!req.body?.name) return res.status(400).json({ error: 'name é obrigatório' });
        const indicator = await indicatorRepository.createIndicator({ processId: process.id, name: req.body.name, description: req.body.description, target: req.body.target, currentValue: req.body.current_value, unit: req.body.unit, status: req.body.status });
        await audit(req.user.id, 'INDICATOR_CREATED', 'indicator', indicator.id, req, { processId: process.id });
        res.status(201).json(indicator);
    } catch (error) { next(error); }
};

const update = async (req, res, next) => {
    try {
        if (invalidUuid(req.params.id)) throw httpError('UUID inválido', 400);
        const indicator = await indicatorRepository.updateIndicator(req.params.id, { name: req.body?.name, description: req.body?.description, target: req.body?.target, currentValue: req.body?.current_value, unit: req.body?.unit, status: req.body?.status });
        if (!indicator) throw httpError('Indicador não encontrado', 404);
        await getProcess(indicator.process_id, req.user);
        await audit(req.user.id, 'INDICATOR_UPDATED', 'indicator', indicator.id, req);
        res.json(indicator);
    } catch (error) { next(error); }
};

module.exports = { list, create, update };
