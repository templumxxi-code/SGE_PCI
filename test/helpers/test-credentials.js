// ============================================================================
// Test Credentials Configuration
// Credenciais de teste centralizadas
// ============================================================================
//
// Este arquivo define credenciais de TESTE apenas.
// NÃO deve ser usado em produção.
// Valor padrão é seguro para testes automatizados.
//

if (process.env.NODE_ENV === 'production') {
    throw new Error('Credenciais de teste não podem ser usadas em produção.');
}

const TEST_CREDENTIALS = {
    admin: {
        email: 'admin@pci.rn.gov.br',
        senha: 'admin123',
        role: 'NGE'
    },
    setor: {
        email: 'setor@pci.rn.gov.br',
        senha: 'setor123',
        role: 'SETOR'
    }
};

/**
 * Obter credencial de teste
 * @param {string} role - 'admin' ou 'setor'
 * @returns {object} Credencial com email e senha
 */
function getTestCredential(role = 'admin') {
    const cred = TEST_CREDENTIALS[role];
    if (!cred) {
        throw new Error(`Credencial de teste desconhecida: ${role}`);
    }
    return cred;
}

/**
 * Obter todos as credenciais de teste
 * @returns {object} Objeto com todas as credenciais
 */
function getAllTestCredentials() {
    return TEST_CREDENTIALS;
}

module.exports = {
    TEST_CREDENTIALS,
    getTestCredential,
    getAllTestCredentials
};
