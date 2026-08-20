// ============================================================================
// Role definitions and authorization helpers
// ============================================================================

const ROLE = {
    NGE_ADMIN: 'NGE_ADMIN',
    GESTOR_UNIDADE: 'GESTOR_UNIDADE',
    CHEFE_SETOR: 'CHEFE_SETOR',
    COLABORADOR: 'COLABORADOR',
    LEGACY_NGE: 'NGE',
    LEGACY_SETOR: 'SETOR'
};

const normalizedPerfil = {
    [ROLE.NGE_ADMIN]: ROLE.LEGACY_NGE,
    [ROLE.COLABORADOR]: ROLE.LEGACY_SETOR,
    NGE: 'NGE',
    ADMIN: 'NGE',
    DIRETOR_INSTITUTO: 'DIRETOR_INSTITUTO',
    SUBCOORDENADOR_REGIONAL: 'SUBCOORDENADOR_REGIONAL',
    SUBCOORDENADOR_INSTITUTO: 'SUBCOORDENADOR_INSTITUTO',
    SUBCOORDENADOR_FINANCEIRA: 'SUBCOORDENADOR_FINANCEIRA',
    SUBCOORDENADOR_ADMINISTRATIVA: 'SUBCOORDENADOR_ADMINISTRATIVA',
    ASSESSOR: 'ASSESSOR',
    CHEFE_NUCLEO: 'CHEFE_NUCLEO',
    OPERACIONAL: 'OPERACIONAL'
};

const normalizePerfil = (perfil) => {
    if (!perfil) {
        return null;
    }
    const normalized = String(perfil).trim().toUpperCase();
    return normalizedPerfil[normalized] || normalized;
};

const isGlobalAdmin = (perfil) => {
    return normalizePerfil(perfil) === ROLE.LEGACY_NGE;
};

const isSectorScoped = (perfil) => {
    const normalized = normalizePerfil(perfil);
    return [ROLE.GESTOR_UNIDADE, ROLE.CHEFE_SETOR, ROLE.LEGACY_SETOR].includes(normalized);
};

const isAnySectorRole = (perfil) => {
    return isSectorScoped(perfil);
};

const canAccessSector = (user, setorId) => {
    if (!user) {
        return false;
    }
    if (isGlobalAdmin(user.perfil)) {
        return true;
    }
    if (!user.setor_id || setorId === null || setorId === undefined) {
        return false;
    }
    return user.setor_id === setorId;
};
const isProfileAllowed = (perfil, allowedProfiles = []) => {
    const normalized = normalizePerfil(perfil);
    return allowedProfiles.map(normalizePerfil).includes(normalized);
};

const getRoleLabel = (perfil) => {
    const normalized = normalizePerfil(perfil);
    switch (normalized) {
        case ROLE.LEGACY_NGE:
            return 'NGE (Administrador)';
        case ROLE.GESTOR_UNIDADE:
            return 'Gestor de Unidade';
        case ROLE.CHEFE_SETOR:
            return 'Chefe de Setor';
        case ROLE.LEGACY_SETOR:
            return 'Colaborador';
        default:
            return normalized || 'Usuário';
    }
};

module.exports = {
    ROLE,
    normalizePerfil,
    isGlobalAdmin,
    isSectorScoped,
    isAnySectorRole,
    canAccessSector,
    isProfileAllowed,
    getRoleLabel
};