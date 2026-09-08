const { query, queryOne } = require('../../models/db');
const checklistRepository = require('../../repositories/bpm/checklistRepository');
const { getActivityContext, invalidUuid, httpError, audit } = require('./access');

const recalculate = async (activityId, phaseId, processId) => {
    const activityProgress = await checklistRepository.calculateChecklistProgress(activityId);
    await query('UPDATE process_activities SET progress=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1', [activityId, activityProgress]);
    const phase = await queryOne('SELECT COALESCE(ROUND(AVG(progress), 2), 0) AS progress FROM process_activities WHERE phase_id=$1', [phaseId]);
    await query('UPDATE process_phases SET progress_percent=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1', [phaseId, phase.progress]);
    const process = await queryOne('SELECT COALESCE(ROUND(AVG(progress_percent), 2), 0) AS progress FROM process_phases WHERE process_id=$1', [processId]);
    await query('UPDATE processes SET progress_percent=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1', [processId, process.progress]);
    return Number(activityProgress);
};

const list = async (req, res, next) => {
    try { await getActivityContext(req.params.id, req.user); res.json(await checklistRepository.getChecklist(req.params.id)); }
    catch (error) { next(error); }
};

const complete = async (req, res, next) => {
    try {
        if (invalidUuid(req.params.id)) throw httpError('UUID inválido', 400);
        const { activity, phase, process } = await getActivityContext(req.params.id, req.user);
        const item = await checklistRepository.completeChecklistItem(req.params.id, req.body?.completed, req.user.id);
        if (!item) throw httpError('Item de checklist não encontrado', 404);
        const progress = await recalculate(activity.id, phase.id, process.id);
        await audit(req.user.id, 'CHECKLIST_COMPLETED', 'checklist', item.id, req, { processId: process.id, progress });
        res.json({ item, progress });
    } catch (error) { next(error); }
};

module.exports = { list, complete };
