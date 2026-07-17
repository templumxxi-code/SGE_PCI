// ============================================================================
// SMP PCI - Servidor Express
// Polícia Científica do Rio Grande do Norte
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'development-secret-change-me');
if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET é obrigatório em produção.');
}
if (!process.env.JWT_SECRET && jwtSecret) {
    process.env.JWT_SECRET = jwtSecret;
}

// Importar rotas
const mockApiRoutes = require('./routes/mockApi');
const db = require('./models/db');
const { loginLimiter, resetLoginLimiter } = require('./middleware/loginLimiter');

// Importar middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = Number(process.env.PORT || 3000);
let routesConfigured = false;
let serverInstance = null;

const parseCorsOrigins = () => {
    const configured = process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000,http://127.0.0.1:3000');
    return configured.split(',').map((value) => value.trim()).filter(Boolean);
};

// ============================================================================
// Middleware
// ============================================================================

app.set('trust proxy', process.env.TRUST_PROXY || 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = parseCorsOrigins();
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Origem não permitida pelo CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// Rotas
// ============================================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const configureApiRoutes = async () => {
    if (routesConfigured) {
        return;
    }

    // Prefer real API routes in test mode so functional tests exercise
    // the real controllers/middleware backed by pg-mem. Allow an
    // explicit override with USE_MOCK_API=true when needed.
    let useMock = process.env.USE_MOCK_API === 'true';

    if (process.env.NODE_ENV === 'test') {
        useMock = false;
    }

    app.locals.authMode = useMock ? 'mock' : 'database';

    if (!useMock) {
        try {
            const client = await db.pool.connect();
            client.release();
        } catch (error) {
            console.warn('⚠️ Banco de dados inacessível. Iniciando modo mock local.');
            useMock = true;
        }
    }

    if (useMock) {
        app.use('/api', mockApiRoutes);
        console.log('✔️  API mock local ativada. Nenhum banco de dados é necessário.');
    } else {
        const authRoutes = require('./routes/auth');
        const processRoutes = require('./routes/processes');
        const indicatorRoutes = require('./routes/indicators');
        const reportRoutes = require('./routes/reports');

        app.use('/api/auth', authRoutes);
        app.use('/api/processes', processRoutes);
        app.use('/api/indicators', indicatorRoutes);
        app.use('/api/reports', reportRoutes);
    }

    routesConfigured = true;
};

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

const initializeApp = async () => {
    await configureApiRoutes();

    app.use((req, res) => {
        res.status(404).json({
            error: 'Rota não encontrada',
            path: req.path
        });
    });

    app.use(errorHandler);
    return app;
};

const startServer = async (port = PORT) => {
    if (serverInstance) {
        return serverInstance;
    }

    await initializeApp();

    serverInstance = app.listen(port, () => {
        console.log(`
    ╔════════════════════════════════════════════════════════════╗
    ║   SMP PCI - Sistema de Monitoramento de Processos BPM      ║
    ║   Polícia Científica do Rio Grande do Norte                ║
    ╠════════════════════════════════════════════════════════════╣
    ║   🚀 Servidor iniciado com sucesso!                        ║
    ║   📍 URL: http://localhost:${port}                            ║
    ║   🔧 Ambiente: ${process.env.NODE_ENV || 'development'}
    ║   📅 Timestamp: ${new Date().toISOString()}                 ║
    ╚════════════════════════════════════════════════════╝
    `);
    });

    serverInstance.once('close', () => {
        serverInstance = null;
    });

    return serverInstance;
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error('Falha ao iniciar o servidor:', error);
        process.exit(1);
    });
}

module.exports = {
    app,
    initializeApp,
    startServer,
    resetLoginLimiter
};
