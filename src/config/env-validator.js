// ============================================================================
// Environment Validator
// Valida variáveis de ambiente obrigatórias e configurações críticas
// ============================================================================

const requiredEnvVars = {
    production: [
        'JWT_SECRET',
        'CORS_ORIGINS'
    ],
    test: [
        'NODE_ENV'
    ],
    development: [
        'NODE_ENV'
    ]
};

/**
 * Validar variáveis de ambiente
 * @param {string} env - Ambiente (development, test, production)
 * @throws {Error} Se variáveis obrigatórias estiverem faltando
 */
function validateEnvironment(env = process.env.NODE_ENV || 'development') {
    const required = requiredEnvVars[env] || [];
    const missing = [];

    for (const varName of required) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `❌ Variáveis de ambiente obrigatórias não configuradas:\n` +
            `   ${missing.join('\n   ')}\n\n` +
            `Configure estas variáveis no arquivo .env ou use export/set:\n` +
            `   ${missing.map(v => `${v}=<valor>`).join('\n   ')}\n\n` +
            `Ambiente atual: ${env}`
        );
    }

    if (env === 'production') {
        const databaseFields = [
            'DATABASE_HOST',
            'DATABASE_PORT',
            'DATABASE_NAME',
            'DATABASE_USER',
            'DATABASE_PASSWORD'
        ];
        const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
        const hasDatabaseFields = databaseFields.every((varName) => Boolean(process.env[varName]));

        if (!hasDatabaseUrl && !hasDatabaseFields) {
            throw new Error('❌ Configure DATABASE_URL ou o conjunto completo DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER e DATABASE_PASSWORD.');
        }
    }

    if (env === 'production') {
        if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
            throw new Error('❌ JWT_SECRET em produção deve ter pelo menos 32 caracteres.');
        }

        const corsOrigins = (process.env.CORS_ORIGINS || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        if (!corsOrigins.length || corsOrigins.some((origin) => origin === '*' || origin === 'https://seu-dominio.com')) {
            throw new Error('❌ CORS_ORIGINS em produção deve conter domínios específicos e nunca "*".');
        }
    }
}

module.exports = {
    validateEnvironment
};
