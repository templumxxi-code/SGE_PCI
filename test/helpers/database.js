const { initializeTestDatabase, resetTestDatabase, pool } = require('../../src/models/db');

const setupDatabase = async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_PG_MEM = 'true';
    await initializeTestDatabase();
    return pool;
};

const teardownDatabase = async () => {
    await pool.end();
};

module.exports = { setupDatabase, resetTestDatabase, teardownDatabase, pool };
