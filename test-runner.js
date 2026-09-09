#!/usr/bin/env node
/**
 * Test Runner - Executa cada arquivo .test.js separadamente
 * node:test com structuredClone() não consegue serializar múltiplos arquivos
 * Este runner executa cada arquivo em um comando separado para evitar erro de serialização
 */

const { execSync } = require('child_process');
const path = require('path');

const testFiles = [
    'test/functional/planejar-01-06.test.js',
    'test/functional/planejar-07-09.test.js',
    'test/functional/planejar-10.test.js',
    'test/functional/planejar-11.test.js',
    'test/functional/planejar-12.test.js',
    'test/functional/dashboard-activity-flow.test.js',
    'test/functional/local-auth-store.test.js',
    'test/functional/notification-source.test.js'
];

let totalTests = 0;
let totalPass = 0;
let totalFail = 0;

console.log('\n🚀 Iniciando suite de testes...');
console.log(`📁 ${testFiles.length} arquivos para executar\n`);

for (const file of testFiles) {
    console.log(`📋 ${file}`);
    
    try {
        const filePath = path.resolve(process.cwd(), file);
        
        // Capturar stdout e stderr juntos
        let output = '';
        try {
            // Usar --test-concurrency=1 para forçar execução serial sem worker threads
            output = execSync(`node --test-concurrency=1 "${filePath}"`, { 
                cwd: process.cwd(),
                encoding: 'utf8'
            });
        } catch (e) {
            // execSync lança erro se exit code != 0, mas podemos capturar output dele
            output = e.stdout || '';
            // Se houver stderr, adicionar também
            if (e.stderr) {
                output += '\n' + e.stderr;
            }
            // Se stderr ou stdout estão vazios, pode ser um erro real
            if (!output.includes('pass ') && !output.includes('fail ')) {
                throw e;
            }
        }
        
        const testsMatch = output.match(/tests (\d+)/);
        const passMatch = output.match(/pass (\d+)/);
        const failMatch = output.match(/fail (\d+)/);
        
        const tests = testsMatch ? parseInt(testsMatch[1]) : 0;
        const pass = passMatch ? parseInt(passMatch[1]) : 0;
        const fail = failMatch ? parseInt(failMatch[1]) : 0;
        
        totalTests += tests;
        totalPass += pass;
        totalFail += fail;
        
        if (fail === 0 && tests > 0) {
            console.log(`  ✅ ${pass}/${tests} passed\n`);
        } else if (fail > 0 || tests === 0) {
            console.log(`  ❌ ${fail} failed\n`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`  ❌ Error: ${error.message}\n`);
        if (error.stdout) console.error('STDOUT:', error.stdout);
        if (error.stderr) console.error('STDERR:', error.stderr);
        process.exit(1);
    }
}

console.log('='.repeat(60));
console.log('📊 RESUMO DOS TESTES');
console.log('='.repeat(60));
console.log(`Total de testes:  ${totalTests}`);
console.log(`Total passou:     ${totalPass}`);
console.log(`Total falhou:     ${totalFail}`);

if (totalFail === 0) {
    console.log('\n✅ TODOS OS TESTES PASSARAM!\n');
    process.exit(0);
} else {
    console.log('\n❌ Alguns testes falharam\n');
    process.exit(1);
}
