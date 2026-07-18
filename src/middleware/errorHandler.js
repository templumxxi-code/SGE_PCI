// ============================================================================
// Middleware de Tratamento de Erros
// ============================================================================

/**
 * Middleware para capturar e tratar erros
 * @param {Error} err - Objeto de erro
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Próximo middleware
 */
const sanitizeMessage = (message) => {
    if (!message) {
        return 'Erro inválido';
    }

    const normalized = String(message).toLowerCase();
    if (normalized.includes('stack') || normalized.includes('sql') || normalized.includes('postgres') || normalized.includes('password')) {
        return 'Erro inválido';
    }

    return String(message);
};

const errorHandler = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const requestId = req.headers['x-request-id'] || 'N/A';

    // Registrar apenas um resumo seguro para evitar vazamento de detalhes internos.
    console.error(`[${timestamp}] ${req.method} ${req.path} [${requestId}] ${err.message}`);

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Erro interno do servidor';
    let errorType = err.errorType || 'INTERNAL_ERROR';

    if (err.code === 'UNIQUE_VIOLATION') {
        statusCode = 409;
        errorType = 'CONFLICT';
        message = 'Registro duplicado ou conflito de dados';
    } else if (err.code === 'FOREIGN_KEY_VIOLATION') {
        statusCode = 400;
        errorType = 'INVALID_REFERENCE';
        message = 'Referência inválida em relacionamento';
    } else if (err.name === 'ValidationError' && !err.statusCode) {
        statusCode = 400;
        errorType = 'VALIDATION_ERROR';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        errorType = 'UNAUTHORIZED';
        message = 'Não autorizado';
    } else if (err.name === 'ForbiddenError') {
        statusCode = 403;
        errorType = 'FORBIDDEN';
        message = 'Acesso proibido';
    }

    if (statusCode >= 400 && statusCode < 500) {
        res.status(statusCode).json({ error: sanitizeMessage(message) });
        return;
    }

    res.status(statusCode).json({
        error: 'Erro interno do servidor.'
    });
};

module.exports = errorHandler;
