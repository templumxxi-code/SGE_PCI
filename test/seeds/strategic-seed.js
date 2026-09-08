const STRATEGIC_TEST_USERS = {
    nge: { email: 'admin@pci.rn.gov.br', password: 'admin123', role: 'NGE_ADMIN' },
    unit: { email: 'setor@pci.rn.gov.br', password: 'setor123', role: 'CHEFE_SETOR' }
};

const STRATEGIC_TEST_UNITS = {
    unitA: '00000000-0000-4000-8000-000000000001',
    unitB: '00000000-0000-4000-8000-000000000002'
};

module.exports = { STRATEGIC_TEST_USERS, STRATEGIC_TEST_UNITS };
