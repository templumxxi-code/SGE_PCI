const moduleRepository = require('../repositories/moduleRepository');

const requireModule = (moduleCode) => async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Autenticação obrigatória' });
    }

    const allowed = await moduleRepository.hasModuleAccess(req.user.id, moduleCode);
    if (!allowed) {
        return res.status(403).json({
            error: 'Módulo não liberado para este usuário',
            module: moduleCode
        });
    }

    return next();
};

module.exports = { requireModule };
