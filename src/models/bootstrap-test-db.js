const fs = require('fs');
const path = require('path');

async function runSqlFile(pool, relativePath) {
    const filePath = path.resolve(__dirname, '../../', relativePath);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    try {
        await pool.query(content);
    } catch (e) {
        // Ignore errors from DROP/CREATE ordering or statements not supported in pg-mem
        console.warn('bootstrap-test-db: erro ao executar SQL em lote:', e.message);
    }
}

async function bootstrapTestDatabase(pool) {
    try {
        await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    } catch (e) {
        // ignore failures on pg-mem or if schemas cannot be dropped
    }

    await runSqlFile(pool, 'database/schema.sql');
    // seed.sql is optional — run if present
    await runSqlFile(pool, 'database/seed.sql');
}

module.exports = {
    bootstrapTestDatabase
};
