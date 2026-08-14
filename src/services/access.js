// ============================================================================
// Authorization and scope helpers
// ============================================================================

const { isGlobalAdmin, canAccessSector } = require('./roles');

const createAccessError = (message, statusCode = 403) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const checkUser = (user) => {
    if (!user) {
        throw createAccessError('Acesso não autorizado', 401);
    }
};

const authorizeSectorAccess = (user, setorId, message = 'Acesso não autorizado') => {
    checkUser(user);
    if (!canAccessSector(user, setorId)) {
        throw createAccessError(message, 403);
    }
};

const addSectorScopeFilter = (queryText, params, user, requestedSetorId, paramCount = 1, columnAlias = 'p') => {
    if (!isGlobalAdmin(user.perfil)) {
        queryText += ` AND ${columnAlias}.setor_id = $${paramCount}`;
        params.push(user.setor_id);
        paramCount += 1;
    } else if (requestedSetorId !== null && requestedSetorId !== undefined) {
        queryText += ` AND ${columnAlias}.setor_id = $${paramCount}`;
        params.push(requestedSetorId);
        paramCount += 1;
    }

    return { queryText, params, paramCount };
};

module.exports = {
    createAccessError,
    authorizeSectorAccess,
    addSectorScopeFilter
};