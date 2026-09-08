// ============================================================================
// Test Helper - Login
// Função centralizada para fazer login nos testes
// ============================================================================

const { getTestCredential } = require('./test-credentials');

/**
 * Fazer login no endpoint de autenticação
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 * @param {string} baseUrl - URL base da API (ex: http://localhost:3000)
 * @returns {Promise<object>} Objeto com {response, body, token}
 */
async function login(email, senha, baseUrl = 'http://localhost:3000') {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, senha })
    });

    const body = await response.json();

    return {
        response,
        body,
        token: body.token || body.access_token,
        ok: response.ok
    };
}

/**
 * Fazer login com credencial de teste (admin ou setor)
 * @param {string} role - 'admin' ou 'setor'
 * @param {string} baseUrl - URL base da API
 * @returns {Promise<object>} Resultado do login
 */
async function loginAs(role = 'admin', baseUrl = 'http://localhost:3000') {
    const cred = getTestCredential(role);
    return login(cred.email, cred.senha, baseUrl);
}

module.exports = {
    login,
    loginAs
};
