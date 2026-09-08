const processRepository = require('../../repositories/bpm/processRepository');
const userRepository = require('../../repositories/userRepository');
const { getUserScope } = require('../../middleware/scopeAccess');
const { getProcess, invalidUuid, httpError, audit } = require('./access');

const create = async (req, res, next) => {
    try {
        const { name, description, organizational_unit_id, responsible_user_id } = req.body || {};
        if (!name || !organizational_unit_id) return res.status(400).json({ error: 'name e organizational_unit_id são obrigatórios' });
        const scope = await getUserScope(req.user);
        if (!scope.global && !scope.unitIds.includes(organizational_unit_id)) return res.status(403).json({ error: 'Unidade fora do escopo' });
        if (responsible_user_id) {
            const responsible = await userRepository.findUserById(responsible_user_id);
            if (!responsible) return res.status(400).json({ error: 'Responsável não encontrado' });
            if (!scope.global && !scope.unitIds.includes(responsible.organizationUnitId)) return res.status(403).json({ error: 'Responsável fora do escopo' });
        }
        const process = await processRepository.createProcess({ name, description, organizationalUnitId: organizational_unit_id, responsibleUserId: responsible_user_id }, req.user);
        await audit(req.user.id, 'PROCESS_CREATED', 'process', process.id, req);
        res.status(201).json({ id: process.id, status: process.status });
    } catch (error) { next(error); }
};

const list = async (req, res, next) => {
    try { res.json(await processRepository.findProcesses(req.user, { status: req.query.status })); }
    catch (error) { next(error); }
};

const get = async (req, res, next) => {
    try { const process = await getProcess(req.params.id, req.user); await audit(req.user.id, 'PROCESS_VIEWED', 'process', process.id, req); res.json(process); }
    catch (error) { next(error); }
};

const update = async (req, res, next) => {
    try {
        if (invalidUuid(req.params.id)) throw httpError('UUID inválido', 400);
        const allowedStatuses = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
        if (req.body?.status && !allowedStatuses.includes(req.body.status)) throw httpError('status inválido', 400);
        if (req.body?.progress_percent !== undefined && (!Number.isFinite(Number(req.body.progress_percent)) || Number(req.body.progress_percent) < 0 || Number(req.body.progress_percent) > 100)) throw httpError('progress_percent inválido', 400);
        const process = await processRepository.updateProcess(req.params.id, {
            name: undefined,
            description: req.body?.description,
            responsibleUserId: req.body?.responsible_user_id,
            status: req.body?.status,
            currentPhase: req.body?.current_phase,
            progressPercent: req.body?.progress_percent
        }, req.user);
        if (!process) throw httpError('Processo não encontrado ou fora do escopo', 404);
        await audit(req.user.id, 'PROCESS_UPDATED', 'process', process.id, req);
        res.json(process);
    } catch (error) { next(error); }
};

module.exports = { create, list, get, update };
