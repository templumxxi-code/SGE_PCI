const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const accessControl = require(path.resolve(__dirname, '../../public/js/access-control.js'));

test('deve expor oito perfis com regras de navegação e visibilidade', () => {
  const profiles = accessControl.getProfiles();
  assert.equal(profiles.length, 8);

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
