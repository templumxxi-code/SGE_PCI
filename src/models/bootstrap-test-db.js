const fs = require('fs');
const path = require('path');
const bcryptjs = require('bcryptjs');
const bootstrappedPools = new WeakSet();

async function runSqlFile(pool, relativePath) {
    const filePath = path.resolve(__dirname, '../../', relativePath);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const statements = splitSqlStatements(content);
    for (const statement of statements) {
        try {
            await pool.query(statement);
        } catch (e) {
            // pg-mem does not implement every PostgreSQL extension or trigger syntax.
            console.warn(`bootstrap-test-db: statement ignorado em ${relativePath}:`, e.message);
        }
    }
}

const splitSqlStatements = (sql) => {
    const statements = [];
    let current = '';
    let quote = null;
    let dollarTag = null;
    for (let index = 0; index < sql.length; index += 1) {
        const character = sql[index];
        const next = sql[index + 1];
        if (dollarTag) {
            current += character;
            if (sql.startsWith(dollarTag, index)) {
                current += sql.slice(index + 1, index + dollarTag.length);
                index += dollarTag.length - 1;
                dollarTag = null;
            }
            continue;
        }
        if (quote) {
            current += character;
            if (character === quote && next === quote) {
                current += next;
                index += 1;
            } else if (character === quote && sql[index - 1] !== '\\') {
                quote = null;
            }
            continue;
        }
        if (character === "'" || character === '"') {
            quote = character;
            current += character;
        } else if (character === '$') {
            const match = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
            if (match) {
                dollarTag = match[0];
                current += dollarTag;
                index += dollarTag.length - 1;
            } else {
                current += character;
            }
        } else if (character === ';') {
            if (current.trim()) statements.push(current.trim());
            current = '';
        } else {
            current += character;
        }
    }
    if (current.trim()) statements.push(current.trim());
    return statements;
};

async function bootstrapTestDatabase(pool) {
    const isPgMem = process.env.USE_PG_MEM === 'true';
    if (isPgMem && bootstrappedPools.has(pool)) return;
    if (!isPgMem) {
        await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    }

    await runSqlFile(pool, 'database/schema.sql');
    await runSqlFile(pool, 'database/seed.sql');

    const migrationsDirectory = path.resolve(__dirname, '../../database/migrations');
    const migrations = fs.readdirSync(migrationsDirectory)
        .filter((file) => file.endsWith('.sql'))
        .sort();
    for (const migration of migrations) {
        await runSqlFile(pool, `database/migrations/${migration}`);
    }

    await seedCanonicalData(pool);
    await seedPlanejarData(pool);
    if (isPgMem) bootstrappedPools.add(pool);
}

async function seedPlanejarData(pool) {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS planejar (
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
            )
        `);
        const existing = await pool.query('SELECT id FROM planejar WHERE processo_id = $1 LIMIT 1', [1]);
        if (!existing.rowCount) {
            await pool.query(
                `INSERT INTO planejar (processo_id, responsavel_id, status) VALUES ($1, $2, 'NÃO_INICIADA')`,
                [1, 1]
            );
        }
    } catch (error) {
        console.warn('bootstrap-test-db: seed Planejar ignorado:', error.message);
    }
}

async function seedCanonicalData(pool) {
    const unitA = '00000000-0000-4000-8000-000000000001';
    const unitB = '00000000-0000-4000-8000-000000000002';
    const adminId = '00000000-0000-4000-8000-000000000011';
    const managerId = '00000000-0000-4000-8000-000000000012';
    const processA = '00000000-0000-4000-8000-000000000021';
    const processB = '00000000-0000-4000-8000-000000000022';

    await pool.query(`
        INSERT INTO organizational_units_v2 (id, nome, tipo)
        VALUES ($1, 'Setor A', 'SETOR'), ($2, 'Setor B', 'SETOR')
        ON CONFLICT (id) DO NOTHING
    `, [unitA, unitB]);

    const adminRole = (await pool.query("SELECT id FROM roles WHERE code = 'NGE_ADMIN' LIMIT 1")).rows[0]?.id;
    const managerRole = (await pool.query("SELECT id FROM roles WHERE code = 'CHEFE_SETOR' LIMIT 1")).rows[0]?.id;
    if (!adminRole || !managerRole) return;

    const { getTestCredential } = require('../../test/helpers/test-credentials');
    const adminCred = getTestCredential('admin');
    const setorCred = getTestCredential('setor');

    const adminHash = await bcryptjs.hash(adminCred.senha, 4);
    const managerHash = await bcryptjs.hash(setorCred.senha, 4);
    await pool.query(`
        INSERT INTO users (id, nome, email, password_hash, ativo, role_id, organizational_unit_id, must_change_password)
        VALUES ($1, 'Admin NGE', $2, $3, TRUE, $4, NULL, FALSE),
               ($5, 'Gestor Setor A', $6, $7, TRUE, $8, $9, FALSE)
        ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, ativo=TRUE
    `, [adminId, adminCred.email, adminHash, adminRole, managerId, setorCred.email, managerHash, managerRole, unitA]);
    await pool.query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT id, role_id FROM users WHERE email IN ($1, $2)
        ON CONFLICT DO NOTHING
    `, [adminCred.email, setorCred.email]);

    const users = await pool.query("SELECT id, email FROM users WHERE email IN ($1, $2)", [adminCred.email, setorCred.email]);
    const userByEmail = Object.fromEntries(users.rows.map((row) => [row.email, row.id]));
    await pool.query(`
        INSERT INTO processes (id, name, organizational_unit_id, created_by, responsible_user_id, status, current_phase, progress_percent)
        VALUES ($1, 'Processo EstratÃ©gico A', $2, $3, $4, 'ACTIVE', 'Planejar', 20),
               ($5, 'Processo EstratÃ©gico B', $6, $3, $4, 'ACTIVE', 'Implementar', 45)
        ON CONFLICT (id) DO NOTHING
    `, [processA, unitA, userByEmail['admin@pci.rn.gov.br'], userByEmail['setor@pci.rn.gov.br'], processB, unitB]);
}

module.exports = {
    bootstrapTestDatabase
};
