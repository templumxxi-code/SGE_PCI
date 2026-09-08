// ============================================================================
// SMP PCI - Arquivo de Configuração
// ============================================================================

module.exports = {
    // Ambiente
    env: process.env.NODE_ENV || 'development',
    
    // Server
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost'
    },

    // Database
    database: {
        host: process.env.NODE_ENV === 'production'
            ? (process.env.DATABASE_HOST || process.env.DB_HOST)
            : (process.env.DATABASE_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: process.env.NODE_ENV === 'production'
            ? (process.env.DATABASE_PORT || process.env.DB_PORT)
            : (process.env.DATABASE_PORT || process.env.DB_PORT || 5432),
        name: process.env.NODE_ENV === 'production'
            ? (process.env.DATABASE_NAME || process.env.DB_NAME)
            : (process.env.DATABASE_NAME || process.env.DB_NAME || 'smp_pci'),
        user: process.env.DATABASE_USER || process.env.DB_USER,
        password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: '24h'
    },

    // Upload
    upload: {
        maxSize: process.env.MAX_FILE_SIZE || 10485760, // 10MB
        directory: process.env.UPLOAD_DIR || './uploads'
    },

    // Attachment storage
    attachment: {
        maxSize: process.env.MAX_FILE_SIZE || 10485760, // 10MB
        directory: process.env.ATTACHMENT_STORAGE_DIR || './storage/attachments'
    },

    // CORS
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? (process.env.CORS_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean)
            : '*',
        credentials: true
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    },

    // Fases BPM
    bpmFases: [
        'Planejar',
        'Analisar',
        'Desenhar',
        'Implementar',
        'Monitorar'
    ],

    // Tipos de indicadores
    tiposIndicadores: [
        'Eficiência',
        'Eficácia',
        'Conformidade',
        'Qualidade'
    ],

    // Periodos para indicadores
    periodosIndicadores: [
        'Diária',
        'Semanal',
        'Mensal',
        'Trimestral',
        'Anual'
    ],

    // Tipos de anexos
    tiposAnexos: [
        'POP',   // Procedimento Operacional Padrão
        'PAP',   // Procedimento de Análise e Prova
        'BPMN',  // Business Process Model and Notation
        'Outro'
    ]
};
