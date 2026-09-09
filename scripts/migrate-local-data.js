const fs = require('fs/promises');
const path = require('path');
const bcryptjs = require('bcryptjs');
const db = require('../src/models/db');
const { users, setores, processos, atividades } = require('../src/mockData');

const backupDirectory = path.join(__dirname, '../storage/backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

const roleCode = (profile) => {
    const aliases = { SETOR: 'CHEFE_SETOR', NGE_ADMIN: 'NGE_ADMIN', ADMIN: 'NGE_ADMIN' };
    return aliases[String(profile || '').toUpperCase()] || String(profile || 'OPERACIONAL').toUpperCase();
};

const migrateLocalData = async () => {
    await fs.mkdir(backupDirectory, { recursive: true });
    await fs.copyFile(path.join(__dirname, '../storage/users.json'), path.join(backupDirectory, `users-${timestamp}.json`)).catch(() => {});

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const roleRows = await client.query('SELECT id, code FROM roles');
        const rolesByCode = new Map(roleRows.rows.map((row) => [row.code, row.id]));
        const unitIds = new Map();

        for (const sector of setores) {
            const unit = await client.query(
                `INSERT INTO organizational_units_v2 (nome, tipo) VALUES ($1, 'SETOR') RETURNING id`,
                [sector.nome]
            );
            unitIds.set(Number(sector.id), unit.rows[0].id);
        }

        const userIds = new Map();
        for (const sourceUser of users) {
            const code = roleCode(sourceUser.perfil);
            const roleId = rolesByCode.get(code) || rolesByCode.get('OPERACIONAL');
            if (!roleId) throw new Error(`Perfil sem role migrável: ${code}`);
            const passwordHash = await bcryptjs.hash(String(sourceUser.senha || 'temporary-change-required'), 12);
            const result = await client.query(
                `INSERT INTO users (nome, email, password_hash, ativo, role_id, organizational_unit_id, must_change_password)
                 VALUES ($1, $2, $3, $4, $5, $6, TRUE)
                 ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome, ativo = EXCLUDED.ativo, role_id = EXCLUDED.role_id,
                     organizational_unit_id = EXCLUDED.organizational_unit_id, must_change_password = TRUE
                 RETURNING id`,
                [sourceUser.nome, sourceUser.email.toLowerCase(), passwordHash, sourceUser.ativo !== false, roleId, unitIds.get(Number(sourceUser.setor_id)) || null]
            );
            userIds.set(Number(sourceUser.id), result.rows[0].id);
        }

        const phaseNames = ['Planejar', 'Analisar', 'Desenhar', 'Implementar', 'Monitorar'];
        const processIds = new Map();
        for (const sourceProcess of processos) {
            const createdBy = userIds.get(Number(sourceProcess.responsavel_id)) || [...userIds.values()][0];
            const process = await client.query(
                `INSERT INTO processes_v2 (nome, descricao, organizational_unit_id, created_by, responsible_user_id, current_phase, status)
                 VALUES ($1, $2, $3, $4, $4, $5, 'EM_ANDAMENTO') RETURNING id`,
                [sourceProcess.nome, sourceProcess.observacoes || null, unitIds.get(Number(sourceProcess.setor_id)) || null, createdBy, phaseNames.includes(sourceProcess.status_fase) ? sourceProcess.status_fase : 'Planejar']
            );
            const processId = process.rows[0].id;
            processIds.set(Number(sourceProcess.id), processId);
            for (let index = 0; index < phaseNames.length; index += 1) {
                await client.query(`INSERT INTO process_phases (process_id, phase_name, order_number, status) VALUES ($1, $2, $3, $4)`, [processId, phaseNames[index], index + 1, phaseNames[index] === sourceProcess.status_fase ? 'EM_ANDAMENTO' : 'PENDENTE']);
            }
        }

        for (const sourceActivity of atividades) {
            const processId = processIds.get(Number(sourceActivity.processo_id));
            if (!processId) continue;
            const phase = await client.query('SELECT id FROM process_phases WHERE process_id = $1 AND phase_name = $2', [processId, sourceActivity.fase || 'Planejar']);
            if (!phase.rows[0]) continue;
            const activity = await client.query(
                `INSERT INTO process_activities (phase_id, codigo, titulo, descricao, responsible_user_id, status, progress)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [phase.rows[0].id, sourceActivity.codigo || `LEGACY-${sourceActivity.id}`, sourceActivity.descricao || 'Atividade migrada', sourceActivity.descricao || null, userIds.get(Number(sourceActivity.responsavel_id)) || null, sourceActivity.concluido ? 'CONCLUIDA' : 'PENDENTE', sourceActivity.concluido ? 100 : 0]
            );
            for (const item of Array.isArray(sourceActivity.checklist) ? sourceActivity.checklist : []) {
                await client.query('INSERT INTO checklist_items (activity_id, descricao, completed, completed_by, completed_at) VALUES ($1, $2, $3, $4, CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END)', [activity.rows[0].id, item.descricao || 'Item migrado', Boolean(item.concluido), item.concluido ? userIds.get(Number(sourceActivity.responsavel_id)) || null : null]);
            }
        }

        await client.query('COMMIT');
        console.log('Dados locais migrados sem apagar a origem. Backup criado em storage/backups.');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

if (require.main === module) {
    migrateLocalData().catch((error) => {
        console.error('Falha ao migrar dados locais:', error.message);
        process.exitCode = 1;
    });
}

module.exports = { migrateLocalData };
