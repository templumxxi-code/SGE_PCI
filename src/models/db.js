// ============================================================================
// Database Connection - PostgreSQL / pg-mem (testes)
// ============================================================================

const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const { Pool } = require('pg');
let bootstrapTestDatabase;
// bootstrap-test-db is heavy and must only be loaded in test initialization paths
// to avoid modifying production startup behavior. Tests should call initializeTestDatabase().
if (process.env.NODE_ENV === 'test' || process.env.USE_PG_MEM === 'true') {
    bootstrapTestDatabase = require('./bootstrap-test-db').bootstrapTestDatabase;
}
require('dotenv').config();

let activePool = null;
let initializationPromise = null;

const isIntegrationTestDatabase = () => {
    const databaseName = (process.env.DB_NAME || '').toLowerCase();
    const testDatabaseUrlEnabled = Boolean(process.env.TEST_DATABASE_URL)
        && (process.env.NODE_ENV === 'test' || process.env.USE_REAL_PG === 'true');
    return testDatabaseUrlEnabled || process.env.USE_REAL_PG === 'true' || databaseName.includes('test') || databaseName.includes('teste');
};

const buildRealPoolConfig = () => {
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        };
    }

    const testDatabaseUrlEnabled = Boolean(process.env.TEST_DATABASE_URL)
        && (process.env.NODE_ENV === 'test' || process.env.USE_REAL_PG === 'true');
    if (testDatabaseUrlEnabled) {
        try {
            const parsedUrl = new URL(process.env.TEST_DATABASE_URL);
            return {
                host: parsedUrl.hostname || '127.0.0.1',
                port: Number(parsedUrl.port || 5432),
                database: parsedUrl.pathname.replace(/^\/+/, '') || process.env.DATABASE_NAME || process.env.DB_NAME || 'smp_pci_test',
                user: decodeURIComponent(parsedUrl.username) || process.env.DATABASE_USER || process.env.DB_USER || 'postgres',
                password: decodeURIComponent(parsedUrl.password) || process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || '',
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
            };
        } catch (error) {
            console.warn('TEST_DATABASE_URL invÃ¡lida, usando DB_*:', error.message);
        }
    }

    return {
        host: process.env.NODE_ENV === 'production'
            ? (process.env.DATABASE_HOST || process.env.DB_HOST)
            : (process.env.DATABASE_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: process.env.NODE_ENV === 'production'
            ? Number(process.env.DATABASE_PORT || process.env.DB_PORT)
            : Number(process.env.DATABASE_PORT || process.env.DB_PORT || 5432),
        database: process.env.NODE_ENV === 'production'
            ? (process.env.DATABASE_NAME || process.env.DB_NAME)
            : (process.env.DATABASE_NAME || process.env.DB_NAME || 'smp_pci'),
        user: process.env.DATABASE_USER || process.env.DB_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || '',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };
};

const seedTestData = async (pool, isPgMem = false) => {
    const resetTable = async (tableName) => {
        if (isPgMem) {
            await pool.query(`DELETE FROM ${tableName};`);
            return;
        }
        await pool.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE;`);
    };

    await resetTable('logs');
    await resetTable('anexos');
    await resetTable('historico_processos');
    await resetTable('indicadores');
    await resetTable('atividades');
    await resetTable('subprocessos');
    await resetTable('processos');
    await resetTable('organizational_units');
    await resetTable('usuarios');
    await resetTable('macroprocessos');
    await resetTable('setores');

    await pool.query(`INSERT INTO setores (id, nome, descricao) VALUES (1, 'Setor A', 'Setor de teste A'), (2, 'Setor B', 'Setor de teste B');`);
    await pool.query(`INSERT INTO macroprocessos (id, nome, descricao) VALUES (1, 'Macroprocesso Teste', 'Macroprocesso de teste');`);

    const { getTestCredential } = require('../../test/helpers/test-credentials');
    const adminCred = getTestCredential('admin');
    const setorCred = getTestCredential('setor');

    const adminHash = await bcryptjs.hash(adminCred.senha, 12);
    const setorHash = await bcryptjs.hash(setorCred.senha, 12);
    await pool.query(`
        INSERT INTO usuarios (id, nome, email, senha_hash, perfil, setor_id, ativo)
        VALUES
            (1, 'Admin', $1, $2, 'NGE', NULL, TRUE),
            (2, 'Setor', $3, $4, 'SETOR', 1, TRUE);
    `, [adminCred.email, adminHash, setorCred.email, setorHash]);

    await pool.query(`INSERT INTO processos (id, nome, setor_id, macroprocesso_id, status_fase, percentual_conclusao, observacoes) VALUES (1, 'Processo A', 1, 1, 'Planejar', 20, 'Processo do setor A'), (2, 'Processo B', 2, 1, 'Implementar', 45, 'Processo do setor B');`);
    await pool.query(`INSERT INTO subprocessos (id, processo_id, nome, descricao, status_fase, ordem) VALUES (1, 1, 'Subprocesso A', 'Subprocesso do processo A', 'Planejar', 1), (2, 2, 'Subprocesso B', 'Subprocesso do processo B', 'Implementar', 1);`);
    await pool.query(`INSERT INTO atividades (id, subprocesso_id, nome, descricao, status, responsavel_id, data_inicio, data_vencimento, ordem) VALUES (1, 1, 'Atividade A', 'Atividade do processo A', 'Pendente', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 1), (2, 2, 'Atividade B', 'Atividade do processo B', 'Pendente', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 1);`);
    await pool.query(`INSERT INTO indicadores (id, processo_id, nome, descricao, valor_meta, valor_atual, tipo_indicador, periodicidade) VALUES (1, 1, 'Indicador A', 'Indicador do processo A', 100, 20, NULL, NULL), (2, 2, 'Indicador B', 'Indicador do processo B', 100, 45, NULL, NULL);`);
};

const createTestPool = async () => {
    // Reuse a single pg-mem instance across the Node process to ensure
    // tests and the running server share the same in-memory DB.
    if (global.__PG_MEM_POOL) {
        return global.__PG_MEM_POOL;
    }

    const { newDb } = require('pg-mem');
    const db = newDb();
    db.public.registerFunction({
        name: 'gen_random_uuid',
        returns: 'uuid',
        implementation: () => crypto.randomUUID()
    });
    const pgAdapter = db.adapters.createPg();
    const TestPool = pgAdapter.Pool;
    const pool = new TestPool();

    global.__PG_MEM_DB = db;
    global.__PG_MEM_POOL = pool;

    await pool.query(`
        CREATE TABLE setores (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(100) NOT NULL UNIQUE,
            descricao TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE usuarios (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(150) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            senha_hash VARCHAR(256) NOT NULL,
            perfil VARCHAR(50) NOT NULL,
            setor_id INT REFERENCES setores(id),
            ativo BOOLEAN DEFAULT TRUE,
            ultimo_acesso TIMESTAMP,
            ultimo_logout_em TIMESTAMP,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE macroprocessos (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(150) NOT NULL UNIQUE,
            descricao TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE processos (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(150) NOT NULL,
            setor_id INT NOT NULL REFERENCES setores(id),
            macroprocesso_id INT NOT NULL REFERENCES macroprocessos(id),
            status_fase VARCHAR(50) DEFAULT 'Planejar',
            percentual_conclusao NUMERIC(5,2) DEFAULT 0,
            data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            data_fim TIMESTAMP,
            responsavel_id INT REFERENCES usuarios(id),
            observacoes TEXT,
            ativo BOOLEAN DEFAULT TRUE,
            excluido_em TIMESTAMP,
            excluido_por INT REFERENCES usuarios(id),
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE indicadores (
            id SERIAL PRIMARY KEY,
            processo_id INT NOT NULL REFERENCES processos(id),
            nome VARCHAR(150) NOT NULL,
            descricao TEXT,
            valor_meta NUMERIC(10,2),
            valor_atual NUMERIC(10,2) DEFAULT 0,
            valor_anterior NUMERIC(10,2),
            unidade_medida VARCHAR(50),
            tipo_indicador VARCHAR(50),
            periodicidade VARCHAR(50),
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE subprocessos (
            id SERIAL PRIMARY KEY,
            processo_id INT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
            nome VARCHAR(150) NOT NULL,
            descricao TEXT,
            status_fase VARCHAR(50) DEFAULT 'Planejar',
            ordem INT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE atividades (
            id SERIAL PRIMARY KEY,
            subprocesso_id INT NOT NULL REFERENCES subprocessos(id) ON DELETE CASCADE,
            nome VARCHAR(150) NOT NULL,
            descricao TEXT,
            status VARCHAR(50) DEFAULT 'Pendente',
            responsavel_id INT REFERENCES usuarios(id),
            data_inicio TIMESTAMP,
            data_vencimento TIMESTAMP,
            ordem INT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE anexos (
            id SERIAL PRIMARY KEY,
            processo_id INT REFERENCES processos(id) ON DELETE CASCADE,
            atividade_id INT REFERENCES atividades(id) ON DELETE CASCADE,
            tipo VARCHAR(50) NOT NULL,
            nome_arquivo VARCHAR(255) NOT NULL,
            nome_armazenado TEXT NOT NULL,
            caminho_arquivo TEXT NOT NULL,
            hash_sha256 VARCHAR(64) NOT NULL,
            tamanho_bytes INT,
            mime_type VARCHAR(100),
            enviado_por INT NOT NULL REFERENCES usuarios(id),
            descricao TEXT,
            data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            excluido_em TIMESTAMP,
            excluido_por INT REFERENCES usuarios(id)
        );
    `);
    await pool.query(`
        CREATE TABLE organizational_units (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(150) NOT NULL,
            sigla VARCHAR(50) NOT NULL UNIQUE,
            tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('DIRETORIA', 'NUCLEO', 'SETOR', 'ASSESSORIA', 'REGIONAL')),
            unidade_superior_id INT REFERENCES organizational_units(id),
            setor_legado_id INT UNIQUE REFERENCES setores(id),
            ativo BOOLEAN DEFAULT TRUE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE INDEX idx_organizational_units_unidade_superior ON organizational_units(unidade_superior_id);
    `);
    await pool.query(`
        CREATE INDEX idx_organizational_units_tipo ON organizational_units(tipo);
    `);
    await pool.query(`
        CREATE INDEX idx_organizational_units_ativo ON organizational_units(ativo);
    `);
    await pool.query(`
        CREATE TABLE logs (
            id SERIAL PRIMARY KEY,
            usuario_id INT NOT NULL REFERENCES usuarios(id),
            acao VARCHAR(200) NOT NULL,
            tabela_afetada VARCHAR(100),
            id_registro INT,
            valores_antigos JSONB,
            valores_novos JSONB,
            endereco_ip VARCHAR(50),
            user_agent TEXT,
            data_acao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE historico_processos (
            id SERIAL PRIMARY KEY,
            processo_id INT NOT NULL REFERENCES processos(id),
            status_anterior VARCHAR(50),
            status_novo VARCHAR(50),
            mudado_por INT REFERENCES usuarios(id),
            comentario TEXT,
            data_mudanca TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE TABLE planejar (
            id SERIAL PRIMARY KEY,
            processo_id INT NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
            objetivo TEXT,
            swot JSONB DEFAULT '[]',
            cronograma JSONB DEFAULT '[]',
            equipe JSONB DEFAULT '[]',
            checklist JSONB DEFAULT '[]',
            aprovacao_checklist JSONB DEFAULT '[]',
            status VARCHAR(50) NOT NULL DEFAULT 'NÃO_INICIADA',
            responsavel_id INT REFERENCES usuarios(id),
            devolucao_justificativa TEXT,
            aprovado_por INT REFERENCES usuarios(id),
            aprovado_em TIMESTAMP,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await seedTestData(pool, true);
    await pool.query("INSERT INTO planejar (processo_id, responsavel_id, status) VALUES (1, 1, 'NÃO_INICIADA');");

    const resetAllSequences = async () => {
        const sequenceTableMap = {
            setores_id_seq: 'setores',
            usuarios_id_seq: 'usuarios',
            macroprocessos_id_seq: 'macroprocessos',
            processos_id_seq: 'processos',
            indicadores_id_seq: 'indicadores',
            subprocessos_id_seq: 'subprocessos',
            atividades_id_seq: 'atividades',
            logs_id_seq: 'logs',
            organizational_units_id_seq: 'organizational_units'
        };

        for (const [sequenceName, tableName] of Object.entries(sequenceTableMap)) {
            try {
                await pool.query(`SELECT setval('${sequenceName}', (SELECT COALESCE(MAX(id), 0) FROM ${tableName}), true);`);
            } catch (e) {
                // ignore missing sequences for tables not created in this environment
            }
        }
    };

    await resetAllSequences();
    await bootstrapTestDatabase(pool);
    return pool;
};

const resetTestDatabase = async () => {
    const shouldReset = process.env.NODE_ENV === 'test' || process.env.USE_PG_MEM === 'true' || process.env.USE_REAL_PG === 'true';
    if (!shouldReset) {
        return;
    }

    const pool = await initializePool();
    const isPgMem = process.env.USE_PG_MEM === 'true';
    const isRealDatabase = !isPgMem && (process.env.USE_REAL_PG === 'true' || isIntegrationTestDatabase());

    if (isPgMem) {
        // For pg-mem, recreate the in-memory database to avoid self-referential
        // foreign key issues and inconsistent truncate behavior.
        global.__PG_MEM_DB = null;
        global.__PG_MEM_POOL = null;
        activePool = null;
        initializationPromise = null;
        await initializePool();
        return;
    }

    if (isRealDatabase) {
        if (process.env.NODE_ENV !== 'test' || !isIntegrationTestDatabase()) {
            throw new Error('resetTestDatabase: refusing to reset a non-test real database');
        }

        try {
            await pool.query(`ALTER TABLE processos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;`);
            await pool.query(`ALTER TABLE processos ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP;`);
            await pool.query(`ALTER TABLE processos ADD COLUMN IF NOT EXISTS excluido_por INT REFERENCES usuarios(id);`);
            await pool.query(
                'TRUNCATE TABLE logs, anexos, alertas, historico_processos, tarefas, atividades, subprocessos, indicadores, processos, organizational_units, usuarios, macroprocessos, setores RESTART IDENTITY CASCADE;'
            );
        } catch (e) {
            console.error('Falha ao truncar tabelas de teste:', e.message);
            throw e;
        }

        await pool.query(`INSERT INTO setores (id, nome, descricao) VALUES (1, 'Setor A', 'Setor de teste A'), (2, 'Setor B', 'Setor de teste B');`);
        await pool.query(`INSERT INTO macroprocessos (id, nome, descricao) VALUES (1, 'Macroprocesso Teste', 'Macroprocesso de teste');`);

        const { getTestCredential } = require('../../test/helpers/test-credentials');
        const adminCred = getTestCredential('admin');
        const setorCred = getTestCredential('setor');

        const adminHash = await bcryptjs.hash(adminCred.senha, 12);
        const setorHash = await bcryptjs.hash(setorCred.senha, 12);
        await pool.query(`
            INSERT INTO usuarios (id, nome, email, senha_hash, perfil, setor_id, ativo)
            VALUES
                (1, 'Admin', $1, $2, 'NGE', NULL, TRUE),
                (2, 'Setor', $3, $4, 'SETOR', 1, TRUE);
        `, [adminCred.email, adminHash, setorCred.email, setorHash]);

        await pool.query(`INSERT INTO processos (id, nome, setor_id, macroprocesso_id, status_fase, percentual_conclusao, observacoes) VALUES (1, 'Processo A', 1, 1, 'Planejar', 20, 'Processo do setor A'), (2, 'Processo B', 2, 1, 'Implementar', 45, 'Processo do setor B');`);
        await pool.query(`INSERT INTO subprocessos (id, processo_id, nome, descricao, status_fase, ordem) VALUES (1, 1, 'Subprocesso A', 'Subprocesso do processo A', 'Planejar', 1), (2, 2, 'Subprocesso B', 'Subprocesso do processo B', 'Implementar', 1);`);
        await pool.query(`INSERT INTO atividades (id, subprocesso_id, nome, descricao, status, responsavel_id, data_inicio, data_vencimento, ordem) VALUES (1, 1, 'Atividade A', 'Atividade do processo A', 'Pendente', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 1), (2, 2, 'Atividade B', 'Atividade do processo B', 'Pendente', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 1);`);
        await pool.query(`INSERT INTO indicadores (id, processo_id, nome, descricao, valor_meta, valor_atual, valor_anterior, unidade_medida, tipo_indicador, periodicidade) VALUES (1, 1, 'Indicador A', 'Indicador do processo A', 100, 20, NULL, NULL, NULL, NULL), (2, 2, 'Indicador B', 'Indicador do processo B', 100, 45, NULL, NULL, NULL, NULL);`);

        const resetSequence = async (sequenceName, tableName) => {
            try {
                const { rows } = await pool.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${tableName};`);
                const maxId = Number(rows[0]?.max_id || 0);
                if (maxId === 0) {
                    await pool.query(`SELECT setval('${sequenceName}', 1, false);`);
                } else {
                    await pool.query(`SELECT setval('${sequenceName}', $1, true);`, [maxId]);
                }
            } catch (e) {
                console.error(`Falha ao ajustar sequÃªncia ${sequenceName}:`, e.message);
            }
        };

        await resetSequence('setores_id_seq', 'setores');
        await resetSequence('macroprocessos_id_seq', 'macroprocessos');
        await resetSequence('usuarios_id_seq', 'usuarios');
        await resetSequence('processos_id_seq', 'processos');
        await resetSequence('subprocessos_id_seq', 'subprocessos');
        await resetSequence('atividades_id_seq', 'atividades');
        await resetSequence('organizational_units_id_seq', 'organizational_units');
        await resetSequence('indicadores_id_seq', 'indicadores');
        await resetSequence('logs_id_seq', 'logs');

        return;
    }

    const tableExists = async (tableName) => {
        const result = await pool.query(
            `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1;`,
            [tableName]
        );
        return result.rowCount > 0;
    };

    const deleteIfExists = async (tableName) => {
        if (await tableExists(tableName)) {
            if (isPgMem) {
                await pool.query(`DELETE FROM ${tableName};`);
            } else {
                await pool.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE;`);
            }
        }
    };

    const orderedTables = [
        'logs',
        'anexos',
        'alertas',
        'historico_processos',
        'tarefas',
        'atividades',
        'subprocessos',
        'indicadores',
        'processos',
        'organizational_units',
        'usuarios',
        'macroprocessos',
        'setores'
    ];

    for (const tableName of orderedTables) {
        await deleteIfExists(tableName);
    }

    await seedTestData(pool, isPgMem);

    const resetSequence = async (sequenceName, tableName) => {
        if (isPgMem) {
            return;
        }

        try {
            const { rows } = await pool.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${tableName};`);
            const maxId = Number(rows[0]?.max_id || 0);
            if (maxId === 0) {
                await pool.query(`SELECT setval('${sequenceName}', 1, false);`);
            } else {
                await pool.query(`SELECT setval('${sequenceName}', $1, true);`, [maxId]);
            }
        } catch (e) {
            console.error(`Falha ao ajustar sequÃªncia ${sequenceName}:`, e.message);
        }
    };

    await resetSequence('setores_id_seq', 'setores');
    await resetSequence('macroprocessos_id_seq', 'macroprocessos');
    await resetSequence('usuarios_id_seq', 'usuarios');
    await resetSequence('processos_id_seq', 'processos');
    await resetSequence('indicadores_id_seq', 'indicadores');
    await resetSequence('logs_id_seq', 'logs');
};

const initializePool = async () => {
    if (activePool) {
        return activePool;
    }

    if (!initializationPromise) {
        initializationPromise = (async () => {
            if (process.env.USE_PG_MEM === 'true') {
                activePool = await createTestPool();
            } else if (process.env.USE_REAL_PG === 'true' || isIntegrationTestDatabase()) {
                const { Pool: PgPool } = require('pg');
                activePool = new PgPool(buildRealPoolConfig());
                activePool.on('error', (err) => {
                    console.error('Erro na conexÃ£o com PostgreSQL:', err);
                });
                // IMPORTANT: Bootstrap is NOT called here. Tests must call initializeTestDatabase() explicitly.
                // This prevents automatic schema modifications during normal application startup.
            } else if (process.env.NODE_ENV === 'test') {
                activePool = await createTestPool();
            } else {
                const { Pool: PgPool } = require('pg');
                activePool = new PgPool(buildRealPoolConfig());
                activePool.on('error', (err) => {
                    console.error('Erro na conexÃ£o com PostgreSQL:', err);
                });
            }
            return activePool;
        })();
    }

    return initializationPromise;
};

/**
 * Initialize test database with bootstrap (schema and migrations)
 * MUST be called explicitly by test files - never called automatically
 * This provides strict isolation of database modifications to test phase only
 */
const initializeTestDatabase = async () => {
    const pool = await initializePool();
    if (!bootstrapTestDatabase) {
        // Load dynamically if not already loaded (supports some test runners)
        bootstrapTestDatabase = require('./bootstrap-test-db').bootstrapTestDatabase;
    }
    await bootstrapTestDatabase(pool);

    const resetSequences = async () => {
        const sequenceTableMap = {
            setores_id_seq: 'setores',
            usuarios_id_seq: 'usuarios',
            macroprocessos_id_seq: 'macroprocessos',
            processos_id_seq: 'processos',
            indicadores_id_seq: 'indicadores',
            subprocessos_id_seq: 'subprocessos',
            atividades_id_seq: 'atividades',
            logs_id_seq: 'logs',
            organizational_units_id_seq: 'organizational_units'
        };

        for (const [sequenceName, tableName] of Object.entries(sequenceTableMap)) {
            try {
                await pool.query(`SELECT setval('${sequenceName}', (SELECT COALESCE(MAX(id), 0) FROM ${tableName}), true);`);
            } catch (e) {
                // ignore missing sequences for tables not created in this environment
            }
        }
    };

    await resetSequences();
    return pool;
};

const poolProxy = {
    connect: async () => {
        const pool = await initializePool();
        return pool.connect();
    },
    query: async (...args) => {
        const pool = await initializePool();
        return pool.query(...args);
    },
    end: async () => {
        if (activePool && typeof activePool.end === 'function') {
            await activePool.end();
        }
    }
};

const checkConnection = async () => {
    await poolProxy.query('SELECT 1');
    return true;
};

/**
 * Executar query no banco de dados
 * @param {string} query - Comando SQL
 * @param {array} params - ParÃ¢metros da query
 * @returns {Promise}
 */
async function query(text, params = []) {
    const start = Date.now();
    try {
        const result = await poolProxy.query(text, params);
        const duration = Date.now() - start;
        console.log(`ðŸ“Š Query executada em ${duration}ms`);
        return result;
    } catch (error) {
        console.error('âŒ Erro na query:', error.message);
        throw error;
    }
}

/**
 * Obter uma Ãºnica linha
 * @param {string} text - Comando SQL
 * @param {array} params - ParÃ¢metros
 * @returns {Promise<object>}
 */
async function queryOne(text, params = []) {
    const result = await query(text, params);
    return result.rows[0];
}

/**
 * Obter mÃºltiplas linhas
 * @param {string} text - Comando SQL
 * @param {array} params - ParÃ¢metros
 * @returns {Promise<array>}
 */
async function queryMany(text, params = []) {
    const result = await query(text, params);
    return result.rows;
}

/**
 * Iniciar transaÃ§Ã£o
 * @returns {Promise<object>}
 */
async function beginTransaction() {
    const client = await poolProxy.connect();
    try {
        await client.query('BEGIN');
        return client;
    } catch (error) {
        client.release();
        throw error;
    }
}

/**
 * Finalizar transaÃ§Ã£o (commit)
 * @param {object} client
 */
async function commit(client) {
    try {
        await client.query('COMMIT');
    } finally {
        client.release();
    }
}

/**
 * Reverter transaÃ§Ã£o (rollback)
 * @param {object} client
 */
async function rollback(client) {
    try {
        await client.query('ROLLBACK');
    } finally {
        client.release();
    }
}

module.exports = {
    pool: poolProxy,
    checkConnection,
    query,
    queryOne,
    queryMany,
    beginTransaction,
    commit,
    rollback,
    resetTestDatabase,
    initializeTestDatabase
};
