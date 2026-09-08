const fs = require('fs/promises');
const path = require('path');
const db = require('../models/db');

const migrationsDirectory = path.join(__dirname, '../../database/migrations');
const baselineSchemaPath = path.join(__dirname, '../../database/schema.sql');

const ensureMigrationsTable = async (client) => {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(120) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

const ensureBaselineSchema = async (client) => {
    const result = await client.query("SELECT to_regclass('public.setores') AS table_name");
    if (result.rows[0].table_name) {
        return;
    }

    const baselineSchema = await fs.readFile(baselineSchemaPath, 'utf8');
    await client.query(baselineSchema);
};

const runMigrations = async () => {
    const files = (await fs.readdir(migrationsDirectory))
        .filter((file) => file.endsWith('.sql'))
        .sort();
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');
        await ensureBaselineSchema(client);
        await ensureMigrationsTable(client);
        const applied = await client.query('SELECT version FROM schema_migrations');
        const appliedVersions = new Set(applied.rows.map((row) => row.version));
        const executed = [];

        for (const file of files) {
            if (appliedVersions.has(file)) continue;
            const sql = await fs.readFile(path.join(migrationsDirectory, file), 'utf8');
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
            executed.push(file);
        }

        await client.query('COMMIT');
        return executed;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

if (require.main === module) {
    runMigrations()
        .then((executed) => {
            console.log(`Migrations aplicadas: ${executed.length}`);
            executed.forEach((version) => console.log(`- ${version}`));
        })
        .catch((error) => {
            console.error('Falha ao executar migrations:', error.message);
            process.exitCode = 1;
        });
}

module.exports = { runMigrations };
