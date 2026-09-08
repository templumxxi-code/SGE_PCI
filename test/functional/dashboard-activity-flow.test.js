const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createSandbox() {
  const storage = {};
  const window = {
    app: { currentUser: { perfil: 'SETOR', setor_id: 1 } },
    DashboardManager: null,
    AccessControl: {
      normalizeUser: (user) => user || {},
      isNGE: (user) => String(user?.perfil || '').toUpperCase() === 'NGE_ADMIN'
    }
  };

  const context = {
    console,
    window,
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
      removeItem(key) {
        delete storage[key];
      },
      clear() {
        Object.keys(storage).forEach((key) => delete storage[key]);
      }
    },
    document: {
      querySelector() { return null; },
      querySelectorAll() { return []; },
      getElementById() { return null; },
      addEventListener(eventName, handler) {
        if (eventName === 'DOMContentLoaded') handler();
      },
      body: { insertAdjacentHTML() {} }
    },
    notificar() {},
    alert() {},
    formatarDataHora() { return ''; },
    Date,
    JSON,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Math,
    parseInt,
    parseFloat,
    setTimeout,
    clearTimeout
  };

  context.globalThis = context;
  context.self = context;
  return context;
}

test('dashboard local usa setor do usuário e atualiza métricas após salvar/submeter atividade', async () => {
  const context = createSandbox();
  const dashboardPath = path.join(__dirname, '..', '..', 'public', 'js', 'dashboard.js');
  const processesPath = path.join(__dirname, '..', '..', 'public', 'js', 'processes.js');

  vm.runInNewContext(`${fs.readFileSync(dashboardPath, 'utf8')}\nthis.DashboardManager = DashboardManager;`, context, { filename: dashboardPath });
  vm.runInNewContext(`${fs.readFileSync(processesPath, 'utf8')}\nthis.ProcessManager = ProcessManager;`, context, { filename: processesPath });

  const initialProcess = {
    id: 1,
    nome: 'Processo A',
    setor_id: 1,
    status_fase: 'Planejar',
    percentual_conclusao: 0,
    teamMembers: [{ id: 1, name: 'Participante de teste', assignedActivities: ['PLAN_A'], ativo: true }],
    phases: [{
      name: 'Planejar',
      activities: [{
        code: 'PLAN_A',
        title: 'A) Estabelecer objetivo do Projeto de Melhoria',
        content: {},
        attachments: [],
        history: [],
        checklist: [
          { itemId: 1, texto: 'Checklist 1', concluido: false },
          { itemId: 2, texto: 'Checklist 2', concluido: false }
        ]
      }]
    }]
  };

  const storedProcesses = [initialProcess];
  context.ProcessManager.getStoredProcesses = () => storedProcesses;
  context.ProcessManager.setStoredProcesses = (items) => {
    if (items[0]) storedProcesses[0] = items[0];
  };
  context.ProcessManager.recalculateAndRender = () => {};
  context.ProcessManager.getStoredSelection = () => null;

  const dashboard = context.DashboardManager;
  const metrics = dashboard.buildDashboardFromLocalProcesses(storedProcesses, context.window.app.currentUser);
  assert.equal(metrics.processos.total, 1);
  assert.equal(metrics.atividades.concluidas, 0);
  // Apenas atividades sem conclusão entram como pendentes.
  assert.equal(metrics.atividades.pendentes, 1);

  const saveResult = await context.ProcessManager.saveActivity(1, 'Planejar', 'PLAN_A');
  assert.equal(saveResult, true);
  assert.equal(storedProcesses[0].phases[0].activities[0].status, 'em_andamento');

  storedProcesses[0].phases[0].activities[0].checklist.forEach((item) => {
    item.concluido = true;
  });

  const submitResult = await context.ProcessManager.submitActivity(1, 'Planejar', 'PLAN_A');
  assert.equal(submitResult, true);
  assert.equal(storedProcesses[0].phases[0].activities[0].concluida, true);
  assert.equal(storedProcesses[0].phases[0].activities[0].status, 'concluida');

  const updatedMetrics = dashboard.buildDashboardFromLocalProcesses(storedProcesses, context.window.app.currentUser);
  assert.equal(updatedMetrics.atividades.concluidas, 1);
  assert.equal(updatedMetrics.atividades.pendentes, 0);

  const noSetorMetrics = dashboard.buildDashboardFromLocalProcesses(storedProcesses, { perfil: 'OPERACIONAL' });
  assert.equal(noSetorMetrics.processos.total, 1);
  assert.equal(noSetorMetrics.atividades.pendentes, 0);
});

test('métrica central considera checklist real de todas as fases e não apenas da fase atual', async () => {
  const context = createSandbox();
  const dashboardPath = path.join(__dirname, '..', '..', 'public', 'js', 'dashboard.js');
  const processesPath = path.join(__dirname, '..', '..', 'public', 'js', 'processes.js');

  vm.runInNewContext(`${fs.readFileSync(dashboardPath, 'utf8')}\nthis.DashboardManager = DashboardManager;`, context, { filename: dashboardPath });
  vm.runInNewContext(`${fs.readFileSync(processesPath, 'utf8')}\nthis.ProcessManager = ProcessManager;`, context, { filename: processesPath });

  const processo = {
    id: 9,
    nome: 'Processo de regressão',
    setor_id: 1,
    phases: [
      {
        name: 'Planejar',
        activities: [{
          code: 'PLAN_A',
          checklist: [
            { itemId: 'a1', concluido: true },
            { itemId: 'a2', concluido: false },
            { itemId: 'a3', concluido: false }
          ]
        }]
      },
      {
        name: 'Analisar',
        activities: [{
          code: 'ANAL_A',
          checklist: [
            { itemId: 'b1', concluido: true },
            { itemId: 'b2', concluido: false }
          ]
        }]
      },
      {
        name: 'Desenhar',
        activities: [{
          code: 'DES_A',
          checklist: []
        }]
      },
      {
        name: 'Implementar',
        activities: [{
          code: 'IMPL_A',
          checklist: [
            { itemId: 'c1', concluido: true },
            { itemId: 'c2', concluido: true }
          ]
        }]
      }
    ]
  };

  const metrics = context.ProcessManager.getProcessChecklistMetrics(processo);
  assert.equal(metrics.total, 7);
  assert.equal(metrics.completed, 4);
  assert.equal(metrics.pending, 3);
  assert.equal(metrics.percent, 57);

  const dashboard = context.DashboardManager;
  const dashboardMetrics = dashboard.calculateNgeDashboardMetrics([processo]);
  assert.equal(dashboardMetrics.checklist.total, 7);
  assert.equal(dashboardMetrics.checklist.completed, 4);
  assert.equal(dashboardMetrics.checklist.pending, 3);
});

test('setores são manualmente cadastrados e as atividades pendentes contam uma vez por processo/atividade', () => {
  const context = createSandbox();
  const dashboardPath = path.join(__dirname, '..', '..', 'public', 'js', 'dashboard.js');
  const processesPath = path.join(__dirname, '..', '..', 'public', 'js', 'processes.js');

  vm.runInNewContext(`${fs.readFileSync(dashboardPath, 'utf8')}\nthis.DashboardManager = DashboardManager;`, context, { filename: dashboardPath });
  vm.runInNewContext(`${fs.readFileSync(processesPath, 'utf8')}\nthis.ProcessManager = ProcessManager;`, context, { filename: processesPath });

  assert.equal(context.ProcessManager.availableSetores.length, 0);

  const processo = {
    id: 10,
    nome: 'Processo de regressão manual',
    setor_id: 99,
    phases: [
      {
        name: 'Planejar',
        activities: [
          { code: 'PLAN_A', checklist: [{ concluido: true }, { concluido: false }], concluida: false },
          { code: 'PLAN_B', checklist: [{ concluido: true }, { concluido: true }], concluida: true }
        ]
      },
      {
        name: 'Analisar',
        activities: [
          { code: 'ANAL_A', checklist: [{ concluido: false }, { concluido: false }], concluida: false },
          { code: 'ANAL_B', checklist: [{ concluido: true }, { concluido: true }], concluida: true }
        ]
      }
    ]
  };

  const metrics = context.DashboardManager.calculateNgeDashboardMetrics([processo]);
  assert.equal(metrics.activities.total, 4);
  assert.equal(metrics.activities.completed, 2);
  assert.equal(metrics.activities.pending, 2);
});
