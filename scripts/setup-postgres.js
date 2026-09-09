const { Client } = require('pg');

const required = ['PG_ADMIN_PASSWORD', 'APP_DATABASE_PASSWORD'];
for (const name of required) {
    if (!process.env[name]) {
        throw new Error(`${name} nao configurada`);
    }
}

const adminClient = new Client({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 5432),
    database: 'postgres',
    user: 'postgres',
    password: process.env.PG_ADMIN_PASSWORD
});

const quotePassword = async (password) => {
    const result = await adminClient.query('SELECT format(\'%L\', $1::text) AS value', [password]);
    return result.rows[0].value;
};

const setup = async () => {
    await adminClient.connect();
    const passwordLiteral = await quotePassword(process.env.APP_DATABASE_PASSWORD);
    const role = await adminClient.query("SELECT 1 FROM pg_roles WHERE rolname = 'sge_app'");

    if (role.rowCount === 0) {
        await adminClient.query(`CREATE ROLE sge_app LOGIN PASSWORD ${passwordLiteral}`);
    } else {
        await adminClient.query(`ALTER ROLE sge_app WITH LOGIN PASSWORD ${passwordLiteral}`);
    }

    const database = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'sge_pci'");
    if (database.rowCount === 0) {
        await adminClient.query('CREATE DATABASE sge_pci OWNER sge_app');
    }

    await adminClient.end();
    console.log('Usuario sge_app e banco sge_pci configurados.');
};

setup().catch(async (error) => {
    console.error('Falha ao configurar PostgreSQL:', error.code || error.message);
    try {
        await adminClient.end();
    } catch {
        // Client may not have connected.
    }
    process.exitCode = 1;
});
