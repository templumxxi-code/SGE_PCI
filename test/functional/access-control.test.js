const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const memoryStore = new Map();
global.localStorage = {
  getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
  setItem: (key, value) => memoryStore.set(key, String(value)),
  removeItem: (key) => memoryStore.delete(key),
  clear: () => memoryStore.clear()
};

const accessControl = require(path.resolve(__dirname, '../../public/js/access-control.js'));

test('deve expor perfis com regras de navegação e visibilidade', () => {
  const profiles = accessControl.getProfiles();
  assert.equal(profiles.length, 10);

  const nge = accessControl.getProfile('NGE');
  const regional = accessControl.getProfile('REGIONAL');
  const setor = accessControl.getProfile('SETOR');

  assert.ok(nge);
  assert.ok(regional);
  assert.ok(setor);
  assert.ok(nge.menu.includes('configuracoes'));
  assert.ok(regional.menu.includes('monitoramento-bpm'));
  assert.ok(!setor.menu.includes('relatorios'));

  const regionalUser = {
    perfil: 'REGIONAL',
    accessProfileKey: 'REGIONAL',
    unitType: 'REGIONAL',
    unitId: 20,
    unitName: 'Regional de Natal'
  };

  const visibleProcess = { id: 1, unitType: 'REGIONAL', setor_id: 20 };
  const blockedProcess = { id: 2, unitType: 'SETOR', setor_id: 99 };

  assert.equal(accessControl.canAccessTab(regionalUser, 'meus-processos'), true);
  assert.equal(accessControl.canAccessTab(regionalUser, 'relatorios'), false);
  assert.equal(accessControl.canViewProcess(regionalUser, visibleProcess), true);
  assert.equal(accessControl.canViewProcess(regionalUser, blockedProcess), false);
});

test('deve normalizar busca e aplicar filtros cumulativos sem ampliar escopo', () => {
  const user = {
    perfil: 'NGE_ADMIN',
    accessProfileKey: 'NGE_ADMIN',
    organizationType: 'NGE'
  };

  const processos = [
    {
      id: 1,
      nome: 'Processo de Química',
      seiNumber: '2024/0001',
      setor_id: 10,
      macroprocesso: 'Investigação',
      status_fase: 'Desenhar',
      responsavel_nome: 'João da Silva',
      participantes: [{ nome: 'Maria Souza' }],
      indicadores: [{ nome: 'Indicador de Qualidade' }],
      ambiente: 'Química'
    },
    {
      id: 2,
      nome: 'Processo de Medicina Legal',
      seiNumber: '2024/0002',
      setor_id: 20,
      macroprocesso: 'Perícia Técnica',
      status_fase: 'Planejar',
      responsavel_nome: 'Ana Paula',
      participantes: [{ nome: 'Carlos Lima' }],
      indicadores: [{ nome: 'Tempo de Resposta' }],
      ambiente: 'Medicina Legal'
    }
  ];

  assert.equal(accessControl.normalizeSearchText('Química'), 'quimica');
  assert.match(accessControl.buildProcessSearchIndex(processos[0]), /quimica|joao|qualidade/);

  const filtered = accessControl.applyDashboardFilters(processos, {
    search: 'joao',
    phase: 'Desenhar',
    status: 'Desenhar'
  }, user);

  assert.deepEqual(filtered.map((item) => item.id), [1]);

  const byParticipant = accessControl.applyDashboardFilters(processos, { search: 'maria' }, user);
  assert.deepEqual(byParticipant.map((item) => item.id), [1]);
});

test('deve evitar duplicatas em estrutura organizacional e permitir remoção de cadastro', () => {
  const organization = {
    institutes: [],
    regionais: [],
    subcoordenações: [],
    assessorias: [
      { id: 10, name: 'Assessoria de Comunicação', active: true },
      { id: 11, name: 'Assessoria de Comunicação', active: true }
    ],
    nuclei: [],
    sectors: []
  };

  accessControl.saveOrganizationData(organization);
  const stored = accessControl.getStoredOrganizationData();
  assert.equal(stored.assessorias.length, 1);

  accessControl.saveStoredUsers([
    { id: 1, nome: 'Usuário A', email: 'a@pci.rn.gov.br', active: true },
    { id: 2, nome: 'Usuário B', email: 'b@pci.rn.gov.br', active: true }
  ]);

  const beforeRemoval = accessControl.getStoredUsers();
  assert.equal(beforeRemoval.length, 2);

  const removedUser = accessControl.removeStoredUser(2);
  assert.equal(removedUser?.id, 2);
  assert.equal(accessControl.getStoredUsers().length, 1);

  const removedUnit = accessControl.removeOrganizationItem('ASSESSORIA', 10);
  assert.equal(removedUnit?.id, 10);
  assert.equal(accessControl.getStoredOrganizationData().assessorias.length, 0);
});

test('deve montar a fila real de aprovações com status, papel e visibilidade por perfil', () => {
  const user = {
    id: 7,
    nome: 'Chefe de Setor',
    email: 'chefe@pci.rn.gov.br',
    accessProfileKey: 'CHEFE_SETOR',
    organizationType: 'SETOR',
    organizationUnitId: 22,
    sectorId: 22,
    unitName: 'Setor de Operações'
  };

  const processos = [
    { id: 1, nome: 'Processo A', organizationType: 'SETOR', sectorId: 22, currentApprovalStatus: 'AGUARDANDO_CHEFE_SETOR', currentApprovalRole: 'CHEFE_SETOR' },
    { id: 2, nome: 'Processo B', organizationType: 'SETOR', sectorId: 99, currentApprovalStatus: 'AGUARDANDO_CHEFE_SETOR', currentApprovalRole: 'CHEFE_SETOR' },
    { id: 3, nome: 'Processo C', organizationType: 'SETOR', sectorId: 22, currentApprovalStatus: 'HOMOLOGADO', currentApprovalRole: 'CHEFE_SETOR' },
    { id: 4, nome: 'Processo D', organizationType: 'SETOR', sectorId: 22, currentApprovalStatus: 'DEVOLVIDO_PARA_CORRECAO', currentApprovalRole: 'CHEFE_SETOR' }
  ];

  const queue = accessControl.getApprovalQueueForUser(user, processos);
  assert.deepEqual(queue.map((item) => item.id), [1, 4]);
  assert.equal(accessControl.getApprovalQueueMetrics(user, processos).pendencias, 2);
  assert.equal(accessControl.canApproveProcess(user, processos[0]), true);
  assert.equal(accessControl.canApproveProcess(user, processos[1]), false);
});
