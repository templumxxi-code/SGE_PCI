const fs = require('fs');

const envPath = '.env';
const required = {
    DATABASE_HOST: process.env.DATABASE_HOST || '127.0.0.1',
    DATABASE_PORT: process.env.DATABASE_PORT || '5432',
    DATABASE_NAME: process.env.DATABASE_NAME || 'sge_pci',
    DATABASE_USER: process.env.DATABASE_USER || 'sge_app',
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD
};

if (!required.DATABASE_PASSWORD) {
    throw new Error('DATABASE_PASSWORD nao configurada');
}

const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const lines = current.split(/\r?\n/).filter((line) => !/^\s*TEST_DATABASE_URL\s*=/.test(line));
const replaceOrAppend = (name, value) => {
    const index = lines.findIndex((line) => new RegExp(`^\\s*${name}\\s*=`).test(line));
    const line = `${name}=${value}`;
    if (index >= 0) lines[index] = line;
    else lines.push(line);
};

for (const [name, value] of Object.entries(required)) replaceOrAppend(name, value);
replaceOrAppend('USE_MOCK_API', 'false');
fs.writeFileSync(envPath, `${lines.join('\n').replace(/\n+$/, '')}\n`);
console.log('Configuracao DATABASE_* atualizada; TEST_DATABASE_URL removida.');
