// ============================================================================
// SMP PCI - Servidor Express
// Polícia Científica do Rio Grande do Norte
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
require('dotenv').config();

// Validar configuração de ambiente
const { validateEnvironment } = require('./config/env-validator');
try {
    validateEnvironment(process.env.NODE_ENV || 'development');
} catch (error) {
    console.error('\n' + error.message + '\n');
    process.exit(1);
}

// Importar rotas
const db = require('./models/db');
const { loginLimiter, resetLoginLimiter } = require('./middleware/loginLimiter');

// Importar middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = Number(process.env.PORT || 3000);
let routesConfigured = false;
let serverInstance = null;

const parseCorsOrigins = () => {
    const defaultOrigins = process.env.NODE_ENV === 'production'
        ? ''
        : 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001';
    const configured = process.env.CORS_ORIGINS || defaultOrigins;
    const origins = configured.split(',').map((value) => value.trim()).filter(Boolean);

    if (process.env.NODE_ENV === 'production' && origins.includes('*')) {
        throw new Error('CORS_ORIGINS em produção não pode conter "*"');
    }

    return origins;
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
        const localOriginPattern = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

        if (!origin || allowedOrigins.includes(origin) || localOriginPattern.test(origin)) {
            callback(null, true);
            return;
        }

        console.warn('CORS origem bloqueada:', origin);
        callback(new Error('Origem não permitida pelo CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(express.static(path.join(__dirname, '../public'), {
    setHeaders: (res, filePath) => {
        if (/\.(?:html|js|css)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'no-store');
        }
    }
}));

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
app.get(['/modules', '/strategic-planning', '/processes/new', '/processes', '/dashboard', '/bpm', '/indicators', '/reports'], (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const configureApiRoutes = async () => {
    if (routesConfigured) {
        return;
    }

    const authRoutes = require('./routes/auth');
    const processRoutes = require('./routes/processes');
    const indicatorRoutes = require('./routes/indicators');
    const reportRoutes = require('./routes/reports');
    const attachmentRoutes = require('./routes/attachments');
    const planejarRoutes = require('./routes/planejar');
    const userRoutes = require('./routes/users');
    const organizationRoutes = require('./routes/organization');
    const checklistRoutes = require('./routes/checklist');
    const bpmRoutes = require('./routes/bpm');
    const dashboardRoutes = require('./routes/dashboard');
    const notificationRoutes = require('./routes/notifications');
    const strategicReportRoutes = require('./routes/strategicReports');
    const moduleRoutes = require('./routes/modules');

    const useMock = process.env.USE_MOCK_API === 'true';
    app.locals.authMode = useMock ? 'mock' : 'database';

    if (useMock) {
        const mockApiRoutes = require('./routes/mockApi');
        app.use('/api', mockApiRoutes);
        console.log('✔️  API mock local ativada. Nenhum banco de dados é necessário.');
    } else {
        app.use('/api/auth', authRoutes);
        app.use('/api', moduleRoutes);
        app.use('/api/processes', processRoutes);
        app.use('/api/indicators', indicatorRoutes);
        app.use('/api/reports', reportRoutes);
        // Keep the legacy POP URL working for cached clients during rollout.
        app.use('/api', reportRoutes);
        app.use('/api/planejar', planejarRoutes);
        app.use('/api', attachmentRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/organization', organizationRoutes);
        app.use('/api/checklist', checklistRoutes);
        app.use('/api/bpm', bpmRoutes);
        app.use('/api/dashboard', dashboardRoutes);
        app.use('/api/notifications', notificationRoutes);
        app.use('/api/reports', strategicReportRoutes);
        console.log('✔️  Rotas reais de autenticação e usuários ativadas com armazenamento local.');
    }

    routesConfigured = true;
};

app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            timestamp: new Date().toISOString()
        });
    }
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

    if (process.env.USE_MOCK_API !== 'true') {
        await db.checkConnection();
    }

    serverInstance = app.listen(port, () => {
        console.log(`
    ╔════════════════════════════════════════════════════════════╗
    ║   SGE PCI/RN - Sistema de Gestão Estratégica               ║
    ║   Polícia Científica do Rio Grande do Norte                ║
    ╠════════════════════════════════════════════════════════════╣
    ║   🚀 Servidor iniciado com sucesso!                        ║
    ║   📍 URL: http://localhost:${port}                            ║
    ║   🔧 Ambiente: ${process.env.NODE_ENV || 'development'}
    ║   📅 Timestamp: ${new Date().toISOString()}                 ║
    ╚════════════════════════════════════════════════════════════╝
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
