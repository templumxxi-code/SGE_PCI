const phaseRepository = require('../../repositories/bpm/phaseRepository');
const processRepository = require('../../repositories/bpm/processRepository');
const { getProcess, getPhaseContext, invalidUuid, httpError, audit } = require('./access');

const create = async (req, res, next) => {
    try {
        if (invalidUuid(req.params.processId)) throw httpError('UUID de processo inválido', 400);
        const process = await getProcess(req.params.processId, req.user);
        await processRepository.ensureProcessV2Mirror(process.id);
        const phaseName = String(req.body?.phase_name || '').trim();
        const phaseOrder = Number(req.body?.order_number ?? req.body?.phase_order);
        const allowedNames = ['Planejar', 'Analisar', 'Desenhar', 'Implementar', 'Monitorar'];
        if (!allowedNames.includes(phaseName)) throw httpError('phase_name inválido', 400);
        if (!Number.isInteger(phaseOrder) || phaseOrder < 1) throw httpError('order_number inválido', 400);
        const phase = await phaseRepository.createPhase({
            processId: process.id,
            phaseCode: req.body?.phase_code || phaseName.toUpperCase(),
            phaseName,
            phaseOrder,
            status: req.body?.status || 'PENDENTE'
        });
        await audit(req.user.id, 'PHASE_CREATED', 'phase', phase.id, req, { processId: process.id });
        res.status(201).json(phase);
    } catch (error) { next(error); }
};

const listByProcess = async (req, res, next) => {
    try { await getProcess(req.params.id, req.user); res.json(await phaseRepository.getProcessPhases(req.params.id)); }
    catch (error) { next(error); }
};

const get = async (req, res, next) => {
    try { const { phase, process } = await getPhaseContext(req.params.id, req.user); await audit(req.user.id, 'PHASE_VIEWED', 'phase', phase.id, req, { processId: process.id }); res.json(phase); }
    catch (error) { next(error); }
};

module.exports = { create, listByProcess, get };
