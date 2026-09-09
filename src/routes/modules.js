const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const moduleRepository = require('../repositories/moduleRepository');

const router = express.Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolveModuleId = async (value) => {
    if (UUID_PATTERN.test(String(value || ''))) return String(value);
    const module = await moduleRepository.findModuleByCode(String(value || '').trim().toUpperCase());
    return module?.id || null;
};

router.get('/modules', verifyToken, async (req, res, next) => {
    try {
        res.json(await moduleRepository.listUserModules(req.user.id));
    } catch (error) {
        next(error);
    }
});

router.get('/admin/users/:id/modules', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        res.json(await moduleRepository.listUserModuleAccess(req.params.id));
    } catch (error) {
        next(error);
    }
});

router.post('/admin/users/:id/modules', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const moduleId = await resolveModuleId(req.body?.moduleId || req.body?.code);
        if (!moduleId) return res.status(400).json({ error: 'Módulo inválido' });
        const module = await moduleRepository.findModuleById(moduleId);
        if (!module) return res.status(404).json({ error: 'Módulo não encontrado' });
        res.status(201).json(await moduleRepository.grantModule(req.params.id, moduleId));
    } catch (error) {
        next(error);
    }
});

router.delete('/admin/users/:id/modules/:moduleId', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const moduleId = await resolveModuleId(req.params.moduleId);
        if (!moduleId) return res.status(404).json({ error: 'Módulo não encontrado' });
        res.json({ removed: await moduleRepository.revokeModule(req.params.id, moduleId) });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
