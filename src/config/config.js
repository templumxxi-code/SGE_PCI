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
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'smp_pci',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'sua_chave_secreta_desenvolvimento',
        expiresIn: '24h'
    },

    // Upload
    upload: {
        maxSize: process.env.MAX_FILE_SIZE || 10485760, // 10MB
        directory: process.env.UPLOAD_DIR || './uploads'
    },

    // CORS
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? 'https://seu-dominio.com'
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
