const fs = require('fs/promises');
const path = require('path');
const bcryptjs = require('bcryptjs');
const { query } = require('../src/models/db');

const sourcePath = path.join(__dirname, '../storage/users.json');

const migratePasswords = async () => {
    const users = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    let migrated = 0;

    for (const user of users) {
        const plainPassword = user.senha || user.password;
        if (!plainPassword) continue;

        const passwordHash = await bcryptjs.hash(String(plainPassword), 12);
        await query(
            'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE LOWER(email) = LOWER($2)',
            [passwordHash, user.email]
        );
        migrated += 1;
    }

    console.log(`Hashes migrados: ${migrated}`);
};

migratePasswords().catch((error) => {
    console.error('Falha ao migrar hashes:', error.message);
    process.exitCode = 1;
});
