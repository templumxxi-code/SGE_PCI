#!/usr/bin/env node

/**
 * Script para inicializar banco de dados PostgreSQL remotamente
 * Lê o arquivo schema.sql e executa no banco configurado em .env
 */

require('dotenv').config();
const pg = require('pg');
const fs = require('fs');
const path = require('path');

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres', // Conecta ao banco padrão primeiro
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function initializeDatabase() {
  try {
    console.log('🔌 Conectando ao PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado com sucesso!');

    // Criar banco de dados
    console.log(`\n📦 Criando banco de dados "${process.env.DB_NAME}"...`);
    try {
      await client.query(`CREATE DATABASE "${process.env.DB_NAME}";`);
      console.log(`✅ Banco "${process.env.DB_NAME}" criado!`);
    } catch (err) {
      if (err.code === '42P04') {
        console.log(`ℹ️  Banco "${process.env.DB_NAME}" já existe, continuando...`);
      } else {
        throw err;
      }
    }

    // Fechar conexão com postgres
    await client.end();

    // Conectar ao novo banco
    const dbClient = new pg.Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log(`\n🔌 Conectando ao banco "${process.env.DB_NAME}"...`);
    await dbClient.connect();
    console.log('✅ Conectado ao banco de dados!');

    // Ler e executar schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    console.log(`\n📄 Lendo schema de: ${schemaPath}`);
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🚀 Executando schema SQL...');
    await dbClient.query(schema);
    console.log('✅ Schema executado com sucesso!');

    // Verificar tabelas criadas
    console.log('\n📊 Tabelas criadas:');
    const result = await dbClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    result.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.table_name}`);
    });

    console.log(`\n✅ Total: ${result.rows.length} tabelas criadas`);

    await dbClient.end();
    console.log('\n🎉 Banco de dados inicializado com sucesso!');
    console.log('🚀 Próximo passo: npm run dev');
    
  } catch (error) {
    console.error('\n❌ Erro ao inicializar banco:');
    console.error(error.message);
    console.error('\n💡 Verifique:');
    console.error('   - As credenciais no arquivo .env');
    console.error('   - Se o PostgreSQL está rodando');
    console.error('   - Se o host/port estão corretos');
    process.exit(1);
  }
}

initializeDatabase();
