(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.AccessControl = api;
    root.accessControl = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const PROFILE_DEFINITIONS = [
        {
            key: 'NGE_ADMIN',
            label: 'NGE_ADMIN',
            visibleName: 'NGE',
            hierarchy: 1,
            unitType: 'NGE',
            description: 'Visão institucional completa',
            tabs: ['dashboard-nge', 'meus-processos', 'novo-processo', 'monitoramento-bpm', 'indicadores', 'relatorios', 'configuracoes', 'aprovacoes'],
            menu: ['dashboard-nge', 'meus-processos', 'novo-processo', 'monitoramento-bpm', 'indicadores', 'relatorios', 'configuracoes', 'aprovacoes', 'usuarios', 'estrutura'],
            actions: ['view', 'edit', 'approve', 'manage_users', 'manage_config'],
            canApprove: false,
            canSeeAll: true,
            allowedUnitTypes: ['INSTITUTO', 'REGIONAL', 'ASSESSORIA', 'NUCLEO', 'SETOR', 'NGE']
        },
        {
            key: 'DIRETOR_INSTITUTO',
            label: 'Diretor de Instituto',
            visibleName: 'Diretor de Instituto',
            hierarchy: 2,
            unitType: 'INSTITUTO',
            description: 'Gerência do instituto',
            tabs: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            menu: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            actions: ['view', 'edit', 'approve'],
            canApprove: true,
            canSeeAll: false,
            allowedUnitTypes: ['INSTITUTO']
        },
        {
            key: 'SUBCOORDENADOR_REGIONAL',
            label: 'Subcoordenador de Regional',
            visibleName: 'Subcoordenador de Regional',
            hierarchy: 3,
            unitType: 'REGIONAL',
            description: 'Coordenação regional',
            tabs: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            menu: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            actions: ['view', 'edit', 'approve'],
            canApprove: true,
            canSeeAll: false,
            allowedUnitTypes: ['REGIONAL']
        },
        {
            key: 'SUBCOORDENADOR_INSTITUTO',
            label: 'Subcoordenador de Instituto',
            visibleName: 'Subcoordenador de Instituto',
            hierarchy: 3,
            unitType: 'INSTITUTO',
            description: 'Subcoordenação de instituto',
            tabs: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            menu: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            actions: ['view', 'edit', 'approve'],
            canApprove: true,
            canSeeAll: false,
            allowedUnitTypes: ['INSTITUTO']
        },
        {
            key: 'SUBCOORDENADOR_FINANCEIRA',
            label: 'Subcoordenador Financeiro',
            visibleName: 'Subcoordenador Financeiro',
            hierarchy: 4,
            unitType: 'ASSESSORIA',
            description: 'Coordenação financeira',
            tabs: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            menu: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            actions: ['view', 'edit', 'approve'],
            canApprove: true,
            canSeeAll: false,
            allowedUnitTypes: ['ASSESSORIA']
        },
        {
            key: 'SUBCOORDENADOR_ADMINISTRATIVA',
            label: 'Subcoordenador Administrativo',
            visibleName: 'Subcoordenador Administrativo',
            hierarchy: 4,
            unitType: 'ASSESSORIA',
            description: 'Coordenação administrativa',
            tabs: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            menu: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            actions: ['view', 'edit', 'approve'],
            canApprove: true,
            canSeeAll: false,
            allowedUnitTypes: ['ASSESSORIA']
        },
        {
            key: 'ASSESSOR',
            label: 'Assessor',
            visibleName: 'Assessor',
            hierarchy: 5,
            unitType: 'ASSESSORIA',
            description: 'Assessoria técnica',
            tabs: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            menu: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            actions: ['view', 'edit', 'approve'],
            canApprove: true,
            canSeeAll: false,
            allowedUnitTypes: ['ASSESSORIA']
        },
        {
            key: 'CHEFE_NUCLEO',
            label: 'Chefe de Núcleo',
            visibleName: 'Chefe de Núcleo',
            hierarchy: 6,
            unitType: 'NUCLEO',
            description: 'Gestão do núcleo',
            tabs: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            menu: ['dashboard-setor', 'meus-processos', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            actions: ['view', 'edit', 'approve'],
            canApprove: true,
            canSeeAll: false,
            allowedUnitTypes: ['NUCLEO']
        },
        {
            key: 'CHEFE_SETOR',
            label: 'Chefe de Setor',
            visibleName: 'Chefe de Setor',
            hierarchy: 6,
            unitType: 'SETOR',
            description: 'Operação do setor',
            tabs: ['dashboard-setor', 'meus-processos', 'novo-processo', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            menu: ['dashboard-setor', 'meus-processos', 'novo-processo', 'monitoramento-bpm', 'indicadores', 'aprovacoes'],
            actions: ['view', 'edit', 'approve', 'submit'],
            canApprove: true,
            canSeeAll: false,
            allowedUnitTypes: ['SETOR']
        },
        {
            key: 'OPERACIONAL',
            label: 'Operacional',
            visibleName: 'Operacional',
            hierarchy: 7,
            unitType: 'SETOR',
            description: 'Execução operacional',
            tabs: ['dashboard-setor', 'meus-processos', 'novo-processo', 'indicadores'],
            menu: ['dashboard-setor', 'meus-processos', 'novo-processo', 'indicadores'],
            actions: ['view', 'edit', 'submit'],
            canApprove: false,
            canSeeAll: false,
            allowedUnitTypes: ['SETOR']
        }
    ];

    const STORAGE_KEYS = {
        organization: 'sge_pci_org_structure',
        users: 'sge_pci_local_users',
        session: 'sge_pci_current_user',
        approvals: 'sge_pci_approval_history'
    };

    const STANDARD_UNITS = [
        { id: 4, name: 'Natal', active: true },
        { id: 1, name: 'Pau dos Ferros', active: true },
        { id: 3, name: 'Mossoró', active: true },
        { id: 2, name: 'Caicó', active: true }
    ];

    const STATUS_DEFINITIONS = {
        RASCUNHO: { visible: 'Rascunho', nextRole: 'CHEFE_SETOR' },
        AGUARDANDO_CHEFE_SETOR: { visible: 'Aguardando Chefe de Setor', nextRole: 'CHEFE_SETOR' },
        AGUARDANDO_CHEFE_NUCLEO: { visible: 'Aguardando Chefe de Núcleo', nextRole: 'CHEFE_NUCLEO' },
        AGUARDANDO_SUBCOORDENADOR_INSTITUTO: { visible: 'Aguardando Subcoordenador de Instituto', nextRole: 'SUBCOORDENADOR_INSTITUTO' },
        AGUARDANDO_DIRETOR_INSTITUTO: { visible: 'Aguardando Diretor de Instituto', nextRole: 'DIRETOR_INSTITUTO' },
        AGUARDANDO_SUBCOORDENADOR_REGIONAL: { visible: 'Aguardando Subcoordenador de Regional', nextRole: 'SUBCOORDENADOR_REGIONAL' },
        AGUARDANDO_ASSESSOR: { visible: 'Aguardando Assessor', nextRole: 'ASSESSOR' },
        DEVOLVIDO_PARA_CORRECAO: { visible: 'Devolvido para correção', nextRole: null },
        HOMOLOGADO: { visible: 'Homologado', nextRole: null },
        ARQUIVADO: { visible: 'Arquivado', nextRole: null }
    };

    function normalizeProfile(profile) {
        const normalized = String(profile || '').trim().toUpperCase();
        if (!normalized) return 'OPERACIONAL';
        const aliases = {
            NGE: 'NGE_ADMIN',
            NGE_ADMIN: 'NGE_ADMIN',
            ADMIN: 'NGE_ADMIN',
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
    }

    function getProfile(key) {
        const profileKey = normalizeProfile(key);
        return PROFILE_DEFINITIONS.find((profile) => profile.key === profileKey) || PROFILE_DEFINITIONS[7];
    }

    function normalizeUser(user) {
        const safeUser = user || {};
        const normalizedProfile = normalizeProfile(safeUser.accessProfileKey || safeUser.perfil || safeUser.profile || safeUser.role);
        const profileDefinition = getProfile(normalizedProfile);
        const organizationType = String(safeUser.organizationType || safeUser.unitType || profileDefinition.unitType || 'SETOR').toUpperCase();
        const unitId = safeUser.organizationUnitId || safeUser.unitId || safeUser.setor_id || safeUser.sectorId || safeUser.sector_id || safeUser.orgUnitId || null;
        const unitName = safeUser.unitName || safeUser.setor_nome || safeUser.orgUnitName || safeUser.nome || '';
        const instituteId = safeUser.instituteId || safeUser.institute_id || null;
        const regionalId = safeUser.regionalId || safeUser.regional_id || null;
        const advisoryId = safeUser.advisoryId || safeUser.advisory_id || null;
        const nucleusId = safeUser.nucleusId || safeUser.nucleus_id || null;
        const sectorId = safeUser.sectorId || safeUser.sector_id || safeUser.setor_id || safeUser.setorId || null;
        return {
            ...safeUser,
            perfil: normalizedProfile,
            accessProfileKey: normalizedProfile,
            role: normalizedProfile,
            organizationType,
            organizationUnitId: unitId,
            instituteId,
            regionalId,
            advisoryId,
            nucleusId,
            sectorId,
            unitType: organizationType,
            unitId,
            unitName,
            profileLabel: profileDefinition.visibleName
        };
    }

    function getProfiles() {
        return PROFILE_DEFINITIONS.map((profile) => ({ ...profile }));
    }

    function isNGE(user) {
        const normalizedUser = normalizeUser(user);
        return String(normalizedUser.accessProfileKey || '').toUpperCase() === 'NGE_ADMIN';
    }

    function canAccessSection(user, sectionName) {
        const normalizedUser = normalizeUser(user);
        if (!sectionName) return false;
        if (sectionName === 'dashboard-nge') {
            return isNGE(normalizedUser);
        }
        if (sectionName === 'dashboard-setor') {
            return true;
        }
        return getVisibleTabs(normalizedUser).includes(sectionName);
    }

    function getDashboardScope(user) {
        const normalizedUser = normalizeUser(user);
        if (isNGE(normalizedUser)) {
            return {
                unrestricted: true,
                organizationType: null,
                organizationUnitId: null,
                instituteId: null,
                regionalId: null,
                advisoryId: null,
                nucleusId: null,
                sectorId: null,
                userId: normalizedUser.id || null
            };
        }

        return {
            unrestricted: false,
            organizationType: String(normalizedUser.organizationType || normalizedUser.unitType || 'SETOR').toUpperCase(),
            organizationUnitId: normalizedUser.organizationUnitId || normalizedUser.unitId || null,
            instituteId: normalizedUser.instituteId || null,
            regionalId: normalizedUser.regionalId || null,
            advisoryId: normalizedUser.advisoryId || null,
            nucleusId: normalizedUser.nucleusId || null,
            sectorId: normalizedUser.sectorId || null,
            userId: normalizedUser.id || null
        };
    }

    function getDisplayName(user) {
        const normalizedUser = normalizeUser(user);
        const profile = getProfile(normalizedUser.accessProfileKey);
        return `${normalizedUser.nome || normalizedUser.name || 'Usuário'} · ${profile.visibleName}`;
    }

    function getVisibleTabs(user) {
        const normalizedUser = normalizeUser(user);
        const profile = getProfile(normalizedUser.accessProfileKey);
        return Array.isArray(profile?.tabs) ? profile.tabs : [];
    }

    function canAccessTab(user, tab) {
        return getVisibleTabs(user).includes(tab);
    }

    function getStoredOrganizationData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.organization);
            const base = { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
            const data = raw ? { ...base, ...JSON.parse(raw) } : base;
            const knownNames = new Set(STANDARD_UNITS.map(unit => unit.name));
            const storedRegions = Array.isArray(data.regionais) ? data.regionais : [];
            const hasOnlyStandardRegions = storedRegions.every(item => knownNames.has(item.name));
            if (hasOnlyStandardRegions) {
                const byName = new Map(storedRegions.map(item => [item.name, item]));
                data.regionais = STANDARD_UNITS.map(unit => ({ ...unit, ...(byName.get(unit.name) || {}) }));
            }
            return data;
        } catch (error) {
            return { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        }
    }

    function saveOrganizationData(data) {
        const normalized = {
            institutes: [],
            regionais: [],
            subcoordenações: [],
            assessorias: [],
            nuclei: [],
            sectors: []
        };
        const source = data || {};
        normalized.institutes = Array.isArray(source.institutes) ? source.institutes : [];
        normalized.regionais = Array.isArray(source.regionais) ? source.regionais : [];
        normalized.subcoordenações = Array.isArray(source.subcoordenações) ? source.subcoordenações : [];
        normalized.assessorias = Array.isArray(source.assessorias) ? source.assessorias : [];
        normalized.nuclei = Array.isArray(source.nuclei) ? source.nuclei : [];
        normalized.sectors = Array.isArray(source.sectors) ? source.sectors : [];
        localStorage.setItem(STORAGE_KEYS.organization, JSON.stringify(normalized));
    }

    function isDemoUser(user) {
        const email = String(user?.email || '').trim().toLowerCase();
        const name = String(user?.nome || user?.name || '').trim().toLowerCase();
        return email === 'setor@pci.rn.gov.br'
            || email === 'x@y.com'
            || email === 'novo@pci.rn.gov.br'
            || email === 'demo@pci.rn.gov.br'
            || email === 'demo@teste.com'
            || email === 'teste@pci.rn.gov.br'
            || (name === 'user')
            || (email.startsWith('demo') && email.includes('@'))
            || (email.startsWith('user') && email.includes('@'))
            || email.startsWith('novo@');
    }

    function getStoredUsers() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.users);
            const users = raw ? JSON.parse(raw) : [];
            return Array.isArray(users) ? users.filter((user) => !isDemoUser(user)) : [];
        } catch (error) {
            return [];
        }
    }

    function saveStoredUsers(users) {
        const cleaned = Array.isArray(users) ? users.filter((user) => !isDemoUser(user)) : [];
        localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(cleaned));
    }

    function seedDemoData() {
        const existing = getStoredOrganizationData();
        const hasData = (existing.institutes?.length || existing.regionais?.length || existing.subcoordenações?.length || existing.assessorias?.length || existing.nuclei?.length || existing.sectors?.length);
        if (hasData) return existing;

        const institutes = [
            { id: 1, name: 'Criminalista', active: true, createdAt: new Date().toISOString() },
            { id: 2, name: 'Medicina Legal', active: true, createdAt: new Date().toISOString() },
            { id: 3, name: 'Identificação', active: true, createdAt: new Date().toISOString() }
        ];
        const regionais = [
            { id: 4, name: 'Natal', active: true, createdAt: new Date().toISOString() },
            { id: 1, name: 'Pau dos Ferros', active: true, createdAt: new Date().toISOString() },
            { id: 3, name: 'Mossoró', active: true, createdAt: new Date().toISOString() },
            { id: 2, name: 'Caicó', active: true, createdAt: new Date().toISOString() }
        ];
        const subcoordenações = [
            { id: 1, name: 'Subcoordenação de Apoio Operacional', active: true, parentType: 'REGIONAL', parentId: 1, createdAt: new Date().toISOString() }
        ];
        const assessorias = [
            { id: 1, name: 'Assessoria Técnica Jurídica', active: true, createdAt: new Date().toISOString() },
            { id: 2, name: 'Assessoria de Comunicação Social', active: true, createdAt: new Date().toISOString() }
        ];
        const nuclei = [
            { id: 1, name: 'Núcleo de Apoio', parentType: 'INSTITUTO', parentUnitId: 1, managerUserId: null, active: true, observations: '', createdAt: new Date().toISOString() }
        ];
        const sectors = [
            { id: 1, name: 'Setor de Apoio', nucleusId: 1, parentUnitId: 1, managerUserId: null, active: true, observations: '', createdAt: new Date().toISOString() }
        ];
        const users = [
            { id: 1, name: 'NGE', email: 'admin@pci.rn.gov.br', registration: '0001', role: 'NGE_ADMIN', organizationType: 'NGE', organizationUnitId: null, instituteId: null, regionalId: null, advisoryId: null, nucleusId: null, sectorId: null, active: true, observations: 'Usuário administrativo', createdAt: new Date().toISOString() }
        ];
        const seed = { institutes, regionais, subcoordenações, assessorias, nuclei, sectors };
        saveOrganizationData(seed);
        saveStoredUsers(users);
        return seed;
    }

    function normalizeProcessAccessStructure(processo) {
        if (!processo || typeof processo !== 'object') return processo;
        const normalized = { ...processo };
        const inferredOrganizationType = normalized.organizationType || normalized.organization_type || normalized.unitType || normalized.unit_type || (normalized.instituteId || normalized.institute_id ? 'INSTITUTO' : normalized.regionalId || normalized.regional_id ? 'REGIONAL' : normalized.advisoryId || normalized.advisory_id ? 'ASSESSORIA' : normalized.nucleusId || normalized.nucleus_id ? 'NUCLEO' : normalized.sectorId || normalized.sector_id || normalized.setor_id || normalized.setorId ? 'SETOR' : 'PENDENTE');
        normalized.organizationType = String(inferredOrganizationType).toUpperCase();
        normalized.organizationUnitId = normalized.organizationUnitId || normalized.organization_unit_id || normalized.unitId || normalized.unit_id || null;
        normalized.instituteId = normalized.instituteId || normalized.institute_id || normalized.instituteId || null;
        normalized.regionalId = normalized.regionalId || normalized.regional_id || normalized.regionalId || null;
        normalized.advisoryId = normalized.advisoryId || normalized.advisory_id || normalized.advisoryId || null;
        normalized.nucleusId = normalized.nucleusId || normalized.nucleus_id || null;
        normalized.sectorId = normalized.sectorId || normalized.sector_id || normalized.setor_id || normalized.setorId || null;
        normalized.createdByUserId = normalized.createdByUserId || normalized.created_by_user_id || null;
        normalized.currentApprovalStatus = normalized.currentApprovalStatus || normalized.current_approval_status || 'RASCUNHO';
        normalized.currentApprovalRole = normalized.currentApprovalRole || normalized.current_approval_role || null;
        normalized.approvalHistory = Array.isArray(normalized.approvalHistory) ? normalized.approvalHistory : [];
        normalized.classificationStatus = normalized.classificationStatus || (normalized.organizationType === 'PENDENTE' ? 'Pendente de classificação organizacional' : 'Classificado');
        normalized.currentApprovalStatusLabel = getApprovalStatusLabel(normalized.currentApprovalStatus);
        return normalized;
    }

    function getApprovalStatusLabel(statusCode) {
        return STATUS_DEFINITIONS[statusCode]?.visible || statusCode || 'Rascunho';
    }

    function getApprovalChain(process) {
        const normalizedProcess = normalizeProcessAccessStructure(process || {});
        const organizationType = String(normalizedProcess.organizationType || '').toUpperCase();
        switch (organizationType) {
            case 'INSTITUTO':
                return ['OPERACIONAL', 'CHEFE_SETOR', 'CHEFE_NUCLEO', 'SUBCOORDENADOR_INSTITUTO', 'DIRETOR_INSTITUTO'];
            case 'REGIONAL':
                return ['OPERACIONAL', 'CHEFE_SETOR', 'CHEFE_NUCLEO', 'SUBCOORDENADOR_REGIONAL'];
            case 'ASSESSORIA':
                return ['OPERACIONAL', 'CHEFE_SETOR', 'CHEFE_NUCLEO', 'SUBCOORDENADOR_FINANCEIRA', 'SUBCOORDENADOR_ADMINISTRATIVA', 'ASSESSOR'];
            default:
                return ['OPERACIONAL', 'CHEFE_SETOR', 'CHEFE_NUCLEO'];
        }
    }

    function getCurrentApprovalStep(process) {
        const normalizedProcess = normalizeProcessAccessStructure(process || {});
        const chain = getApprovalChain(normalizedProcess);
        const currentStatus = String(normalizedProcess.currentApprovalStatus || 'RASCUNHO').toUpperCase();
        if (currentStatus === 'HOMOLOGADO' || currentStatus === 'ARQUIVADO') {
            return null;
        }
        if (currentStatus === 'DEVOLVIDO_PARA_CORRECAO') {
            return 'DEVOLVIDO_PARA_CORRECAO';
        }
        const index = chain.findIndex((role) => currentStatus === `AGUARDANDO_${role}`);
        if (index >= 0) {
            return chain[index];
        }
        if (currentStatus === 'RASCUNHO') {
            return chain[0];
        }
        return chain[0];
    }

    function canViewProcess(user, processo) {
        const normalizedUser = normalizeUser(user);
        const profile = getProfile(normalizedUser.accessProfileKey);
        if (!profile) return false;

        const normalizedProcess = normalizeProcessAccessStructure(processo);
        if (normalizedProcess.active === false) {
            return false;
        }
        if (isNGE(normalizedUser)) return true;
        if (profile.canSeeAll) return true;
        if (normalizedProcess.classificationStatus === 'Pendente de classificação organizacional' && normalizedUser.accessProfileKey !== 'NGE_ADMIN') {
            return false;
        }

        const processOrgType = String(normalizedProcess.organizationType || 'SETOR').toUpperCase();
        const hierarchicalTypes = {
            DIRETOR_INSTITUTO: ['INSTITUTO', 'NUCLEO', 'SETOR'],
            SUBCOORDENADOR_INSTITUTO: ['INSTITUTO', 'NUCLEO', 'SETOR'],
            SUBCOORDENADOR_REGIONAL: ['REGIONAL', 'NUCLEO', 'SETOR'],
            ASSESSOR: ['ASSESSORIA', 'NUCLEO', 'SETOR'],
            SUBCOORDENADOR_FINANCEIRA: ['ASSESSORIA', 'NUCLEO', 'SETOR'],
            SUBCOORDENADOR_ADMINISTRATIVA: ['ASSESSORIA', 'NUCLEO', 'SETOR'],
            CHEFE_NUCLEO: ['NUCLEO', 'SETOR'],
            CHEFE_SETOR: ['SETOR'],
            OPERACIONAL: ['SETOR']
        };
        const allowedTypes = hierarchicalTypes[normalizedUser.accessProfileKey] || profile.allowedUnitTypes;
        if (!allowedTypes.includes(processOrgType) && processOrgType !== 'PENDENTE') return false;

        const processUnitId = String(normalizedProcess.organizationUnitId || normalizedProcess.instituteId || normalizedProcess.regionalId || normalizedProcess.advisoryId || normalizedProcess.nucleusId || normalizedProcess.sectorId || '').trim();
        const userUnitId = String(normalizedUser.organizationUnitId || normalizedUser.instituteId || normalizedUser.regionalId || normalizedUser.advisoryId || normalizedUser.nucleusId || normalizedUser.sectorId || '').trim();

        if (normalizedUser.accessProfileKey === 'DIRETOR_INSTITUTO') {
            return String(normalizedProcess.instituteId || normalizedProcess.organizationUnitId || normalizedProcess.sectorId || normalizedProcess.regionalId || '').trim() === String(normalizedUser.instituteId || normalizedUser.organizationUnitId || '').trim();
        }
        if (normalizedUser.accessProfileKey === 'SUBCOORDENADOR_INSTITUTO') {
            return String(normalizedProcess.instituteId || normalizedProcess.organizationUnitId || normalizedProcess.sectorId || normalizedProcess.regionalId || '').trim() === String(normalizedUser.instituteId || normalizedUser.organizationUnitId || '').trim();
        }
        if (normalizedUser.accessProfileKey === 'SUBCOORDENADOR_REGIONAL') {
            return String(normalizedProcess.regionalId || normalizedProcess.organizationUnitId || normalizedProcess.sectorId || '').trim() === String(normalizedUser.regionalId || normalizedUser.organizationUnitId || normalizedUser.sectorId || '').trim();
        }
        if (normalizedUser.accessProfileKey === 'ASSESSOR') {
            return String(normalizedProcess.advisoryId || normalizedProcess.organizationUnitId || normalizedProcess.sectorId || '').trim() === String(normalizedUser.advisoryId || normalizedUser.organizationUnitId || normalizedUser.sectorId || '').trim();
        }
        if (normalizedUser.accessProfileKey === 'CHEFE_NUCLEO') {
            return String(normalizedProcess.nucleusId || normalizedProcess.sectorId || normalizedProcess.organizationUnitId || '').trim() === String(normalizedUser.nucleusId || normalizedUser.organizationUnitId || normalizedUser.sectorId || '').trim();
        }
        if (normalizedUser.accessProfileKey === 'CHEFE_SETOR') {
            return String(normalizedProcess.sectorId || normalizedProcess.organizationUnitId || '').trim() === String(normalizedUser.sectorId || normalizedUser.organizationUnitId || '').trim();
        }
        if (normalizedUser.accessProfileKey === 'OPERACIONAL') {
            return String(normalizedProcess.sectorId || normalizedProcess.organizationUnitId || '').trim() === String(normalizedUser.sectorId || normalizedUser.organizationUnitId || '').trim() || String(normalizedProcess.createdByUserId) === String(normalizedUser.id);
        }
        return false;
    }

    function canViewIndicator(user, indicator) {
        return canViewProcess(user, indicator?.process || indicator);
    }

    function canEditProcess(user, processo) {
        const normalizedUser = normalizeUser(user);
        const normalizedProcess = normalizeProcessAccessStructure(processo);
        const profile = getProfile(normalizedUser.accessProfileKey);
        if (!profile.actions.includes('edit') || !canViewProcess(user, normalizedProcess)) {
            return false;
        }
        return ['RASCUNHO', 'DEVOLVIDO_PARA_CORRECAO'].includes(String(normalizedProcess.currentApprovalStatus || 'RASCUNHO').toUpperCase());
    }

    function canSubmitProcess(user, processo) {
        const normalizedUser = normalizeUser(user);
        const normalizedProcess = normalizeProcessAccessStructure(processo);
        return normalizedUser.accessProfileKey === 'OPERACIONAL' && ['RASCUNHO', 'DEVOLVIDO_PARA_CORRECAO'].includes(String(normalizedProcess.currentApprovalStatus || 'RASCUNHO').toUpperCase());
    }

    function canApproveProcess(user, processo) {
        const normalizedUser = normalizeUser(user);
        const normalizedProcess = normalizeProcessAccessStructure(processo);
        const expectedRole = normalizedProcess.currentApprovalRole || getCurrentApprovalStep(normalizedProcess);
        const expectedStatus = `AGUARDANDO_${expectedRole}`;
        if (!normalizedProcess.currentApprovalStatus || normalizedProcess.currentApprovalStatus === 'RASCUNHO' || normalizedProcess.currentApprovalStatus === 'HOMOLOGADO') {
            return false;
        }
        return String(normalizedUser.accessProfileKey).toUpperCase() === String(expectedRole).toUpperCase() && canViewProcess(user, normalizedProcess);
    }

    function canReturnProcess(user, processo) {
        const normalizedUser = normalizeUser(user);
        const normalizedProcess = normalizeProcessAccessStructure(processo);
        return canApproveProcess(user, normalizedProcess) || normalizedUser.accessProfileKey === 'NGE_ADMIN';
    }

    function getVisibleProcesses(user, processes) {
        const processList = Array.isArray(processes) ? processes : [];
        const normalizedUser = normalizeUser(user);
        if (isNGE(normalizedUser)) {
            return processList.filter((processo) => processo && processo.active !== false);
        }
        return processList.filter((processo) => processo && canViewProcess(normalizedUser, processo));
    }

    function filterVisibleProcesses(user, processes) {
        return getVisibleProcesses(user, processes);
    }

    function getDashboardFilteredProcesses(processes, user, filters = {}) {
        const visibleProcesses = getVisibleProcesses(user, processes);
        const scope = getDashboardScope(user);
        const normalizedFilters = filters || {};

        return visibleProcesses.filter((processo) => {
            const normalizedProcess = normalizeProcessAccessStructure(processo);
            if (!scope.unrestricted) {
                const processMatchesScope = (() => {
                    if (scope.organizationType === 'INSTITUTO') {
                        return String(normalizedProcess.instituteId || normalizedProcess.organizationUnitId || '').trim() === String(scope.instituteId || scope.organizationUnitId || '').trim();
                    }
                    if (scope.organizationType === 'REGIONAL') {
                        return String(normalizedProcess.regionalId || normalizedProcess.organizationUnitId || '').trim() === String(scope.regionalId || scope.organizationUnitId || '').trim();
                    }
                    if (scope.organizationType === 'ASSESSORIA') {
                        return String(normalizedProcess.advisoryId || normalizedProcess.organizationUnitId || '').trim() === String(scope.advisoryId || scope.organizationUnitId || '').trim();
                    }
                    if (scope.organizationType === 'NUCLEO') {
                        return String(normalizedProcess.nucleusId || normalizedProcess.organizationUnitId || '').trim() === String(scope.nucleusId || scope.organizationUnitId || '').trim();
                    }
                    if (scope.organizationType === 'SETOR') {
                        return String(normalizedProcess.sectorId || normalizedProcess.organizationUnitId || '').trim() === String(scope.sectorId || scope.organizationUnitId || '').trim();
                    }
                    return true;
                })();
                if (!processMatchesScope) return false;
            }

            if (normalizedFilters.unitType && normalizedFilters.unitType !== 'TODAS') {
                const expectedType = String(normalizedFilters.unitType).toUpperCase();
                const processType = String(normalizedProcess.organizationType || '').toUpperCase();
                if (processType !== expectedType) return false;
            }
            if (normalizedFilters.unitId) {
                const unitValue = String(normalizedFilters.unitId).trim();
                const processUnitValue = [normalizedProcess.instituteId, normalizedProcess.regionalId, normalizedProcess.advisoryId, normalizedProcess.nucleusId, normalizedProcess.sectorId, normalizedProcess.organizationUnitId].find((value) => String(value || '').trim() === unitValue);
                if (!processUnitValue) return false;
            }
            if (normalizedFilters.userId) {
                const userValue = String(normalizedFilters.userId).trim();
                if (String(normalizedProcess.createdByUserId || '').trim() !== userValue) return false;
            }
            if (normalizedFilters.status) {
                const statusValue = String(normalizedFilters.status).toUpperCase();
                if (String(normalizedProcess.currentApprovalStatus || '').toUpperCase() !== statusValue) return false;
            }
            if (normalizedFilters.phase) {
                const phaseValue = String(normalizedFilters.phase).toLowerCase();
                const hasPhase = Array.isArray(normalizedProcess.phases) && normalizedProcess.phases.some((phase) => String(phase?.name || '').toLowerCase() === phaseValue);
                if (!hasPhase) return false;
            }
            return true;
        });
    }

    function filterVisibleIndicators(user, indicators) {
        return (Array.isArray(indicators) ? indicators : []).filter((indicator) => canViewIndicator(user, indicator));
    }

    function getScopeSummary(user) {
        const normalizedUser = normalizeUser(user);
        const profile = getProfile(normalizedUser.accessProfileKey);
        return `${profile.visibleName}${normalizedUser.unitName ? ` · ${normalizedUser.unitName}` : ''}`;
    }

    function getPendingApprovals(user) {
        const processes = JSON.parse(localStorage.getItem('sge_pci_processos') || '[]');
        return (Array.isArray(processes) ? processes : []).map(normalizeProcessAccessStructure).filter((processo) => {
            const status = String(processo.currentApprovalStatus || 'RASCUNHO').toUpperCase();
            if (status === 'HOMOLOGADO' || status === 'ARQUIVADO' || status === 'RASCUNHO') return false;
            const normalizedUser = normalizeUser(user);
            if (normalizedUser.accessProfileKey === 'NGE_ADMIN') return true;
            return String(processo.currentApprovalRole || '').toUpperCase() === String(normalizedUser.accessProfileKey).toUpperCase();
        });
    }

    function getProfileOptionsForLogin() {
        return PROFILE_DEFINITIONS.map((profile) => ({
            value: profile.key,
            label: profile.visibleName,
            description: profile.description
        }));
    }

    function saveCurrentUser(user) {
        localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(normalizeUser(user)));
    }

    function getCurrentUser() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.session);
            return raw ? normalizeUser(JSON.parse(raw)) : null;
        } catch (error) {
            return null;
        }
    }

    const NOTIFICATION_STORAGE_KEY = 'sge_pci_notifications';

    function safeParseJson(value, fallback) {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function getAllNotifications() {
        const notifications = safeParseJson(localStorage.getItem(NOTIFICATION_STORAGE_KEY), []);
        return Array.isArray(notifications) ? notifications.map(normalizeNotification).filter(Boolean) : [];
    }

    function normalizeNotification(notification) {
        if (!notification || typeof notification !== 'object') return null;
        const normalized = { ...notification };
        normalized.id = normalized.id || `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        normalized.category = normalized.category || 'SYSTEM';
        normalized.priority = normalized.priority || 'INFO';
        normalized.read = Boolean(normalized.read);
        normalized.archived = Boolean(normalized.archived);
        normalized.createdAt = normalized.createdAt || new Date().toISOString();
        normalized.readAt = normalized.readAt || null;
        return normalized;
    }

    function saveNotifications(notifications) {
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify((Array.isArray(notifications) ? notifications : []).map(normalizeNotification).filter(Boolean)));
    }

    function notificationExists(dedupKey) {
        if (!dedupKey) return false;
        return getAllNotifications().some((notification) => String(notification.dedupKey || '').trim() === String(dedupKey).trim());
    }

    const ALLOWED_NOTIFICATION_EVENTS = [
        'PROCESSO_CRIADO',
        'PROCESSO_SUBMETIDO',
        'ATIVIDADE_SUBMETIDA',
        'ATIVIDADE_AVANCADA',
        'PROCESSO_APROVADO',
        'PROCESSO_DEVOLVIDO',
        'PROCESSO_HOMOLOGADO',
        'PROCESSO_ARQUIVADO',
        'INDICADOR_CADASTRADO',
        'CONTRA_MEDIDA_CADASTRADA',
        'USUARIO_CRIADO',
        'USUARIO_ATUALIZADO',
        'USUARIO_INATIVADO',
        'PRAZO_VENCIDO',
        'SISTEMA'
    ];

    function isKnownEventSource(sourceEvent) {
        return ALLOWED_NOTIFICATION_EVENTS.includes(String(sourceEvent || '').trim().toUpperCase());
    }

    function createNotification(params = {}) {
        const payload = { ...params };
        const sourceEvent = String(payload.sourceEvent || payload.eventType || 'SISTEMA').trim().toUpperCase();
        if (!isKnownEventSource(sourceEvent)) {
            return null;
        }

        const dedupKey = payload.dedupKey || [
            sourceEvent,
            payload.processId || '',
            payload.recipientUserId || payload.targetUserId || '',
            payload.entityId || payload.targetProcessId || payload.indicatorId || '',
            payload.createdAt || new Date().toISOString()
        ].join(':');

        if (notificationExists(dedupKey)) {
            return null;
        }

        const normalized = normalizeNotification({
            id: payload.id || `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            recipientUserId: payload.recipientUserId || null,
            recipientRole: payload.recipientRole || null,
            organizationType: payload.organizationType || null,
            organizationUnitId: payload.organizationUnitId || null,
            instituteId: payload.instituteId || null,
            regionalId: payload.regionalId || null,
            advisoryId: payload.advisoryId || null,
            nucleusId: payload.nucleusId || null,
            sectorId: payload.sectorId || null,
            processId: payload.processId || null,
            indicatorId: payload.indicatorId || null,
            phaseCode: payload.phaseCode || null,
            activityCode: payload.activityCode || null,
            category: payload.category || 'SYSTEM',
            priority: payload.priority || 'INFO',
            title: payload.title || 'Notificação',
            message: payload.message || '',
            read: Boolean(payload.read),
            archived: Boolean(payload.archived),
            targetSection: payload.targetSection || null,
            targetProcessId: payload.targetProcessId || payload.processId || null,
            targetPhaseCode: payload.targetPhaseCode || payload.phaseCode || null,
            targetActivityCode: payload.targetActivityCode || payload.activityCode || null,
            targetIndicatorId: payload.targetIndicatorId || payload.indicatorId || null,
            createdAt: payload.createdAt || new Date().toISOString(),
            readAt: payload.readAt || null,
            dedupKey,
            eventType: sourceEvent,
            sourceEvent,
        });

        const existing = getAllNotifications();
        existing.unshift(normalized);
        saveNotifications(existing);
        return normalized;
    }

    function getNotificationsForUser(user) {
        const normalizedUser = normalizeUser(user);
        const notifications = getAllNotifications();
        return notifications.filter((notification) => canUserReceiveNotification(normalizedUser, notification));
    }

    function getUnreadNotificationCount(user) {
        return getNotificationsForUser(user).filter((notification) => !notification.read).length;
    }

    function canUserReceiveNotification(user, notification) {
        if (!notification || typeof notification !== 'object') return false;

        const normalizedUser = normalizeUser(user);
        if (!normalizedUser || !normalizedUser.accessProfileKey) return false;

        if (String(normalizedUser.accessProfileKey).toUpperCase() === 'NGE_ADMIN') {
            return !Boolean(notification.archived);
        }

        if (notification.recipientUserId && String(notification.recipientUserId) !== String(normalizedUser.id)) {
            return false;
        }

        if (notification.recipientRole && String(notification.recipientRole).toUpperCase() !== String(normalizedUser.accessProfileKey).toUpperCase()) {
            return false;
        }

        if (notification.processId) {
            const processList = safeParseJson(localStorage.getItem('sge_pci_processos'), []);
            const process = Array.isArray(processList) ? processList.find((item) => String(item.id) === String(notification.processId)) : null;
            if (process && !canViewProcess(normalizedUser, process)) {
                return false;
            }
        }

        if (notification.instituteId && normalizedUser.instituteId && String(normalizedUser.instituteId) !== String(notification.instituteId)) {
            return false;
        }
        if (notification.regionalId && normalizedUser.regionalId && String(normalizedUser.regionalId) !== String(notification.regionalId)) {
            return false;
        }
        if (notification.advisoryId && normalizedUser.advisoryId && String(normalizedUser.advisoryId) !== String(notification.advisoryId)) {
            return false;
        }
        if (notification.nucleusId && normalizedUser.nucleusId && String(normalizedUser.nucleusId) !== String(notification.nucleusId)) {
            return false;
        }
        if (notification.sectorId && normalizedUser.sectorId && String(normalizedUser.sectorId) !== String(notification.sectorId)) {
            return false;
        }

        return !Boolean(notification.archived);
    }

    return {
        PROFILE_DEFINITIONS,
        STORAGE_KEYS,
        STATUS_DEFINITIONS,
        normalizeProfile,
        normalizeUser,
        getProfiles,
        getProfile,
        isNGE,
        getDisplayName,
        getVisibleTabs,
        canAccessTab,
        canAccessSection,
        getDashboardScope,
        getStoredOrganizationData,
        saveOrganizationData,
        getStoredUsers,
        saveStoredUsers,
        seedDemoData,
        normalizeProcessAccessStructure,
        getApprovalStatusLabel,
        getApprovalChain,
        getCurrentApprovalStep,
        canViewProcess,
        canViewIndicator,
        canEditProcess,
        canSubmitProcess,
        canApproveProcess,
        canReturnProcess,
        getVisibleProcesses,
        filterVisibleProcesses,
        getDashboardFilteredProcesses,
        filterVisibleIndicators,
        getScopeSummary,
        getPendingApprovals,
        getProfileOptionsForLogin,
        saveCurrentUser,
        getCurrentUser,
        getAllNotifications,
        normalizeNotification,
        saveNotifications,
        notificationExists,
        createNotification,
        getNotificationsForUser,
        getUnreadNotificationCount,
        canUserReceiveNotification,
        NOTIFICATION_STORAGE_KEY
    };
});
