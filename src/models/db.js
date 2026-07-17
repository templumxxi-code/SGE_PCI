// ============================================================================
// Database Connection - PostgreSQL / pg-mem (testes)
// ============================================================================

const bcryptjs = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

let activePool = null;
let initializationPromise = null;

const seedTestData = async (pool) => {
    await pool.query('DELETE FROM logs;');
    await pool.query('DELETE FROM historico_processos;');
    await pool.query('DELETE FROM indicadores;');
    await pool.query('DELETE FROM processos;');
    await pool.query('DELETE FROM usuarios;');
    await pool.query('DELETE FROM macroprocessos;');
    await pool.query('DELETE FROM setores;');

    await pool.query(`INSERT INTO setores (id, nome, descricao) VALUES (1, 'Setor A', 'Setor de teste A'), (2, 'Setor B', 'Setor de teste B');`);
    await pool.query(`INSERT INTO macroprocessos (id, nome, descricao) VALUES (1, 'Macroprocesso Teste', 'Macroprocesso de teste');`);

    const adminHash = await bcryptjs.hash('admin123', 12);
    const setorHash = await bcryptjs.hash('setor123', 12);
    await pool.query(`
        INSERT INTO usuarios (id, nome, email, senha_hash, perfil, setor_id, ativo)
        VALUES
            (1, 'Admin', 'admin@pci.rn.gov.br', $1, 'NGE', NULL, TRUE),
            (2, 'Setor', 'setor@pci.rn.gov.br', $2, 'SETOR', 1, TRUE);
    `, [adminHash, setorHash]);

    await pool.query(`INSERT INTO processos (id, nome, setor_id, macroprocesso_id, status_fase, percentual_conclusao, observacoes) VALUES (1, 'Processo A', 1, 1, 'Planejar', 20, 'Processo do setor A'), (2, 'Processo B', 2, 1, 'Implementar', 45, 'Processo do setor B');`);
    await pool.query(`INSERT INTO indicadores (id, processo_id, nome, descricao, valor_meta, valor_atual, tipo_indicador, periodicidade) VALUES (1, 1, 'Indicador A', 'Indicador do processo A', 100, 20, 'Eficiência', 'Mensal'), (2, 2, 'Indicador B', 'Indicador do processo B', 100, 45, 'Eficiência', 'Mensal');`);
};

const createTestPool = async () => {
    // Reuse a single pg-mem instance across the Node process to ensure
    // tests and the running server share the same in-memory DB.
    if (global.__PG_MEM_POOL) {
        return global.__PG_MEM_POOL;
    }

    const { newDb } = require('pg-mem');
    const db = newDb();
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

    await seedTestData(pool);
    return pool;
};

const resetTestDatabase = async () => {
    if (process.env.NODE_ENV !== 'test' && process.env.USE_PG_MEM !== 'true') {
        return;
    }

    const pool = await initializePool();
    await seedTestData(pool);
};

const initializePool = async () => {
    if (activePool) {
        return activePool;
    }

    if (!initializationPromise) {
        initializationPromise = (async () => {
            if (process.env.NODE_ENV === 'test' || process.env.USE_PG_MEM === 'true') {
                activePool = await createTestPool();
            } else {
                const { Pool: PgPool } = require('pg');
                activePool = new PgPool({
                    host: process.env.DB_HOST || 'localhost',
                    port: Number(process.env.DB_PORT || 5432),
                    database: process.env.DB_NAME || 'smp_pci',
                    user: process.env.DB_USER || 'postgres',
                    password: process.env.DB_PASSWORD || 'postgres',
                    max: 20,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                });
                activePool.on('error', (err) => {
                    console.error('Erro na conexão com PostgreSQL:', err);
                });
            }
            return activePool;
        })();
    }

    return initializationPromise;
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

/**
 * Executar query no banco de dados
 * @param {string} query - Comando SQL
 * @param {array} params - Parâmetros da query
 * @returns {Promise}
 */
async function query(text, params = []) {
    const start = Date.now();
    try {
        const result = await poolProxy.query(text, params);
        const duration = Date.now() - start;
        console.log(`📊 Query executada em ${duration}ms:`, text.substring(0, 50) + '...');
        return result;
    } catch (error) {
        console.error('❌ Erro na query:', error);
        throw error;
    }
}

/**
 * Obter uma única linha
 * @param {string} text - Comando SQL
 * @param {array} params - Parâmetros
 * @returns {Promise<object>}
 */
async function queryOne(text, params = []) {
    const result = await query(text, params);
    return result.rows[0];
}

/**
 * Obter múltiplas linhas
 * @param {string} text - Comando SQL
 * @param {array} params - Parâmetros
 * @returns {Promise<array>}
 */
async function queryMany(text, params = []) {
    const result = await query(text, params);
    return result.rows;
}

/**
 * Iniciar transação
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
 * Finalizar transação (commit)
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
 * Reverter transação (rollback)
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
    query,
    queryOne,
    queryMany,
    beginTransaction,
    commit,
    rollback,
    resetTestDatabase
};
