// ============================================================================
// Limiter de login
// ============================================================================

const rateLimit = require('express-rate-limit');

const createLoginLimiter = () => rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 10),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente mais tarde.' });
    }
});

const loginLimiter = createLoginLimiter();

const resetLoginLimiter = () => {
    const keys = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    keys.forEach((key) => {
        try {
            loginLimiter.resetKey(key);
        } catch {
            // Ignorar falhas de reset em ambientes sem store suportado.
        }
    });
};

module.exports = {
    loginLimiter,
    resetLoginLimiter
};
