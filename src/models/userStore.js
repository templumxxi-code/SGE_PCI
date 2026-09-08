const fs = require('fs');
const path = require('path');
const bcryptjs = require('bcryptjs');

const STORAGE_FILE = path.join(__dirname, '../../storage/users.json');
const DEMO_EMAILS = new Set([
    'setor@pci.rn.gov.br',
    'admin@pci.rn.gov.br',
    'x@y.com',
    'novo@pci.rn.gov.br',
    'demo@pci.rn.gov.br',
    'demo@teste.com',
    'teste@pci.rn.gov.br'
]);

const isDemoAccount = (user) => {
    const email = String(user?.email || '').trim().toLowerCase();
    const name = String(user?.nome || user?.name || '').trim().toLowerCase();
    return DEMO_EMAILS.has(email)
        || (name === 'user')
        || (email.startsWith('demo') && email.includes('@'))
        || (email.startsWith('user') && email.includes('@'))
        || (email.startsWith('novo@'));
};

const stripDemoAccounts = (users) => {
    const normalized = Array.isArray(users) ? users : [];
    return normalized.filter((user) => !isDemoAccount(user));
};

const normalizeProfile = (profile) => {
    const normalized = String(profile || '').trim().toUpperCase();
    if (!normalized) return 'OPERACIONAL';
    const aliases = {
        NGE_ADMIN: 'NGE',
        ADMIN: 'NGE',
        NGE: 'NGE',
        DIRETOR: 'DIRETOR_INSTITUTO',
        DIRETOR_INSTITUTO: 'DIRETOR_INSTITUTO',
        REGIONAL: 'SUBCOORDENADOR_REGIONAL',
        SUBCOORDENADOR: 'SUBCOORDENADOR_INSTITUTO',
        SUBCOORDENADOR_REGIONAL: 'SUBCOORDENADOR_REGIONAL',
        SUBCOORDENADOR_INSTITUTO: 'SUBCOORDENADOR_INSTITUTO',
        SUBCOORDENADOR_FINANCEIRA: 'SUBCOORDENADOR_FINANCEIRA',
        SUBCOORDENADOR_ADMINISTRATIVA: 'SUBCOORDENADOR_ADMINISTRATIVA',
        FINANCEIRO: 'SUBCOORDENADOR_FINANCEIRA',
        ADMINISTRATIVO: 'SUBCOORDENADOR_ADMINISTRATIVA',
        ASSESSORIA: 'ASSESSOR',
        ASSESSOR: 'ASSESSOR',
        SETOR: 'CHEFE_SETOR',
        CHEFE_NUCLEO: 'CHEFE_NUCLEO',
        CHEFE_SETOR: 'CHEFE_SETOR',
        OPERACIONAL: 'OPERACIONAL',
        GESTOR_UNIDADE: 'CHEFE_NUCLEO',
        COLABORADOR: 'OPERACIONAL'
    };
    return aliases[normalized] || normalized;
};

/**
 * Normalizar múltiplos perfis
 * Converte um perfil (string) ou múltiplos perfis (array) para um array normalizado
 */
const normalizeProfiles = (perfisInput) => {
    if (!perfisInput) return ['OPERACIONAL'];
    
    let perfis = Array.isArray(perfisInput) ? perfisInput : [perfisInput];
    perfis = perfis
        .map((p) => normalizeProfile(p))
        .filter((p) => p && p !== '')
        .filter((p, index, arr) => arr.indexOf(p) === index); // Remover duplicatas
    
    return perfis.length > 0 ? perfis : ['OPERACIONAL'];
};

const normalizeOrganizationType = (profile) => {
    if (profile === 'NGE') return 'NGE';
    if (profile === 'DIRETOR_INSTITUTO' || profile === 'SUBCOORDENADOR_INSTITUTO') return 'INSTITUTO';
    if (profile === 'SUBCOORDENADOR_REGIONAL') return 'REGIONAL';
    if (profile === 'ASSESSOR') return 'ASSESSORIA';
    if (profile === 'CHEFE_NUCLEO') return 'NUCLEO';
    if (profile === 'CHEFE_SETOR' || profile === 'OPERACIONAL') return 'SETOR';
    return 'SETOR';
};

const ensureStorageDirectory = () => {
    const dir = path.dirname(STORAGE_FILE);
    fs.mkdirSync(dir, { recursive: true });
};

const createDefaultSeed = () => {
    const { getTestCredential } = require('../../test/helpers/test-credentials');
    const adminCred = getTestCredential('admin');
    const setorCred = getTestCredential('setor');
    const now = new Date().toISOString();
    return [
        {
            id: 1,
            nome: 'Admin NGE',
            name: 'Admin NGE',
            registration: '0001',
            email: adminCred.email,
            passwordHash: bcryptjs.hashSync(adminCred.senha, 12),
            perfil: 'NGE',
            role: 'NGE',
            organizationType: 'NGE',
            organizationUnitId: null,
            instituteId: null,
            regionalId: null,
            advisoryId: null,
            nucleusId: null,
            sectorId: null,
            setor_id: null,
            active: true,
            observations: 'Usuário administrativo inicial',
            createdAt: now,
            updatedAt: now
        }
    ];
};

const readUsers = () => {
    ensureStorageDirectory();
    const seed = createDefaultSeed();

    if (!fs.existsSync(STORAGE_FILE)) {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(seed, null, 2));
        return seed;
    }

    try {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        const sanitized = stripDemoAccounts(Array.isArray(parsed) ? parsed : []);

        const hasAdmin = sanitized.some((user) => String(user?.email || '').trim().toLowerCase() === 'admin@pci.rn.gov.br');
        const normalizedUsers = hasAdmin ? sanitized : [...seed, ...sanitized];

        if (normalizedUsers.length !== sanitized.length + (hasAdmin ? 0 : 1)) {
            fs.writeFileSync(STORAGE_FILE, JSON.stringify(normalizedUsers, null, 2));
        }

        if (!hasAdmin) {
            fs.writeFileSync(STORAGE_FILE, JSON.stringify(normalizedUsers, null, 2));
        }

        return normalizedUsers;
    } catch (error) {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(seed, null, 2));
        return seed;
    }
};

const writeUsers = (users) => {
    ensureStorageDirectory();
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(users, null, 2));
};

const normalizeUser = (user) => {
    if (!user) return null;
    
    // Suportar tanto perfil único quanto múltiplos perfis
    const perfis = normalizeProfiles(user.perfis || user.perfil || user.role);
    // Para compatibilidade, manter o primeiro perfil como "perfil" único
    const perfil = perfis[0];
    const organizationType = user.organizationType || user.organization_type || normalizeOrganizationType(perfil);
    const sectorId = user.sectorId ?? user.sector_id ?? user.setor_id ?? null;
    
    return {
        ...user,
        id: Number(user.id),
        nome: user.nome || user.name || 'Usuário',
        name: user.name || user.nome || 'Usuário',
        registration: user.registration || user.matricula || null,
        email: String(user.email || '').trim().toLowerCase(),
        perfis, // Array de perfis do usuário
        perfil, // Primeiro perfil (para compatibilidade)
        role: perfil,
        organizationType,
        organizationUnitId: user.organizationUnitId ?? user.organization_unit_id ?? user.unitId ?? user.unit_id ?? null,
        instituteId: user.instituteId ?? user.institute_id ?? null,
        regionalId: user.regionalId ?? user.regional_id ?? null,
        advisoryId: user.advisoryId ?? user.advisory_id ?? null,
        nucleusId: user.nucleusId ?? user.nucleus_id ?? null,
        sectorId,
        setor_id: sectorId,
        active: user.active !== false,
        observations: user.observations || user.observacao || '',
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString()
    };
};

const sanitizeUser = (user) => {
    if (!user) return null;
    const { passwordHash, password, ...rest } = user;
    return rest;
};

const listUsers = () => {
    const users = readUsers().map(normalizeUser).filter(Boolean);
    return users.map(sanitizeUser);
};

const findUserByEmail = (email) => {
    const normalizado = String(email || '').trim().toLowerCase();
    const user = readUsers().map(normalizeUser).find((item) => item && item.email === normalizado);
    return user ? normalizeUser(user) : null;
};

const findUserById = (id) => {
    const parsedId = Number(id);
    const user = readUsers().map(normalizeUser).find((item) => item && Number(item.id) === parsedId);
    return user ? normalizeUser(user) : null;
};

const verifyPassword = async (email, senha) => {
    const user = findUserByEmail(email);
    if (!user) return null;
    const isValid = await bcryptjs.compare(String(senha || ''), user.passwordHash || '');
    if (!isValid) return null;
    return user;
};

const createUser = async (input) => {
    const users = readUsers().map(normalizeUser).filter(Boolean);
    const now = new Date().toISOString();
    
    // Suportar perfis (múltiplos) ou perfil (único)
    const perfisInput = input.perfis || input.perfil || input.role || 'OPERACIONAL';
    const perfis = normalizeProfiles(perfisInput);
    
    const normalizedInput = normalizeUser({
        ...input,
        nome: input.nome || input.name,
        name: input.name || input.nome,
        registration: input.registration || input.matricula,
        email: input.email,
        perfis, // Armazenar múltiplos perfis
        perfil: input.perfil || input.role,
        role: input.role || input.perfil,
        organizationType: input.organizationType || input.organization_type,
        organizationUnitId: input.organizationUnitId ?? input.organization_unit_id ?? input.unitId ?? input.unit_id,
        instituteId: input.instituteId ?? input.institute_id,
        regionalId: input.regionalId ?? input.regional_id,
        advisoryId: input.advisoryId ?? input.advisory_id,
        nucleusId: input.nucleusId ?? input.nucleus_id,
        sectorId: input.sectorId ?? input.sector_id ?? input.setor_id ?? input.setorId,
        setor_id: input.sectorId ?? input.sector_id ?? input.setor_id ?? input.setorId,
        active: input.active !== false,
        observations: input.observations || input.observacao || '',
        createdAt: now,
        updatedAt: now
    });

    if (!normalizedInput.email) {
        throw new Error('E-mail obrigatório');
    }

    if (users.some((user) => user.email === normalizedInput.email)) {
        throw new Error('E-mail já cadastrado');
    }

    if (normalizedInput.registration && users.some((user) => String(user.registration || '') === String(normalizedInput.registration))) {
        throw new Error('Matrícula já cadastrada');
    }

    const passwordHash = await bcryptjs.hash(String(input.senha || input.password || ''), 12);

    const newUser = {
        ...normalizedInput,
        id: Date.now(),
        passwordHash,
        createdAt: now,
        updatedAt: now
    };

    users.push(newUser);
    writeUsers(users);
    return sanitizeUser(normalizeUser(newUser));
};

const updateUser = async (id, updates) => {
    const users = readUsers().map(normalizeUser).filter(Boolean);
    const index = users.findIndex((user) => Number(user.id) === Number(id));
    if (index < 0) {
        return null;
    }

    const currentUser = users[index];
    const nextUser = normalizeUser({
        ...currentUser,
        ...updates,
        id: currentUser.id,
        nome: updates.nome || updates.name || currentUser.nome,
        name: updates.name || updates.nome || currentUser.name,
        registration: updates.registration || updates.matricula || currentUser.registration,
        email: updates.email || currentUser.email,
        perfil: updates.perfil || updates.role || currentUser.perfil,
        role: updates.role || updates.perfil || currentUser.role,
        organizationType: updates.organizationType || updates.organization_type || currentUser.organizationType,
        organizationUnitId: updates.organizationUnitId ?? updates.organization_unit_id ?? currentUser.organizationUnitId,
        instituteId: updates.instituteId ?? updates.institute_id ?? currentUser.instituteId,
        regionalId: updates.regionalId ?? updates.regional_id ?? currentUser.regionalId,
        advisoryId: updates.advisoryId ?? updates.advisory_id ?? currentUser.advisoryId,
        nucleusId: updates.nucleusId ?? updates.nucleus_id ?? currentUser.nucleusId,
        sectorId: updates.sectorId ?? updates.sector_id ?? updates.setor_id ?? currentUser.sectorId,
        setor_id: updates.sectorId ?? updates.sector_id ?? updates.setor_id ?? currentUser.setor_id,
        active: updates.active !== undefined ? updates.active : currentUser.active,
        observations: updates.observations || updates.observacao || currentUser.observations,
        updatedAt: new Date().toISOString()
    });

    if (updates.senha || updates.password) {
        nextUser.passwordHash = await bcryptjs.hash(String(updates.senha || updates.password), 12);
    }

    users[index] = nextUser;
    writeUsers(users);
    return sanitizeUser(nextUser);
};

const deleteUser = async (id) => {
    const users = readUsers().map(normalizeUser).filter(Boolean);
    const userToDelete = users.find((user) => Number(user.id) === Number(id));
    if (!userToDelete) {
        return null;
    }

    const remainingUsers = users.filter((user) => Number(user.id) !== Number(id));
    writeUsers(remainingUsers);
    return sanitizeUser(userToDelete);
};

const changePassword = async (id, senhaNova) => {
    const users = readUsers().map(normalizeUser).filter(Boolean);
    const index = users.findIndex((user) => Number(user.id) === Number(id));
    if (index < 0) {
        return null;
    }
    users[index].passwordHash = await bcryptjs.hash(String(senhaNova || ''), 12);
    users[index].updatedAt = new Date().toISOString();
    writeUsers(users);
    return true;
};

const resetStore = () => {
    writeUsers(createDefaultSeed());
};

module.exports = {
    listUsers,
    findUserByEmail,
    findUserById,
    verifyPassword,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    resetStore,
    normalizeProfile,
    normalizeProfiles,
    sanitizeUser
};
