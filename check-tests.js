#!/usr/bin/env node
/**
 * Verificador simples de testes
 * Roda npm test e reporta exit code
 */

const { execSync } = require('child_process');

try {
    console.log('🧪 Executando suite de testes...\n');
    execSync('node test-runner.js', { 
        cwd: process.cwd(),
        stdio: 'inherit'  // Mostrar output em tempo real
    });
    console.log('\n✅ TESTES PASSARAM COM SUCESSO! (EXIT CODE 0)');
    process.exit(0);
} catch (error) {
    console.log('\n❌ TESTES FALHARAM (EXIT CODE 1)');
    process.exit(1);
}
