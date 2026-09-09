# Sprint 1 Baseline

Data: 24/08/2026  
Projeto: SGE PCI/RN  
Raiz real: `C:\Users\Luiz Mateus\Documents\SISTEMAS\PCI-RN\SMP PCI`  
Branch: `sprint-07c-perfis-escopos`  
Commit de referencia: `cfc60518a1e01985005732be7975b5b5ef135e89`

## Estado revalidado

- Processo Node ouvindo `:::3000`: PID 12080, `node.exe`, iniciado por `npm.cmd start`/`node src/server.js`.
- Stack: Express, frontend HTML/CSS/JavaScript vanilla, JWT, bcrypt, multer, Helmet, pg e pg-mem.
- `USE_MOCK_API=true` continua efetivo no processo local; a aplicacao em uso e a API mock em memoria.
- PostgreSQL local nao estava ouvindo em `5432` durante a Sprint 1.
- `package-lock.json` existe.

## Persistencia encontrada

- Usuarios: `src/mockData.js`, `storage/users.json` e tabelas legadas `usuarios` no caminho PostgreSQL.
- Processos/atividades/checklists/indicadores/aprovacoes/notificacoes: mock em memoria, localStorage no frontend e tabelas legadas parciais no PostgreSQL.
- Anexos: mock em memoria no modo mock; controller real grava metadata em `anexos` e arquivos em `storage/attachments`.
- Auditoria: arrays `logs` no mock e tabela `logs` no caminho PostgreSQL.

## Fundacao criada

- `database/migrations/0006_sprint1_foundation.sql`: RBAC, usuarios, unidades, processos/fases/atividades/checklist, equipe, anexos, aprovacoes, notificacoes e auditoria canonicos.
- `src/database/migrator.js`: runner transacional com `schema_migrations`.
- `scripts/migrate-local-data.js`: backup e importacao nao destrutiva de dados locais.
- `src/middleware/authorize.js`: autorizacao por role/permissao.
- Rotas novas: `/api/users`, `/api/organization/tree`, `/api/checklist/:id` e `/api/auth/logout` no modo PostgreSQL.
- `GET /api/health` agora consulta o banco e sinaliza `database=connected` ou `database=disconnected`.
- Documentacao: `docs/BACKEND_ARCHITECTURE.md` e `docs/DATABASE_SCHEMA.md`.

## Validacao

- Sintaxe das novas rotas e migrator: validada.
- Testes focados de perfis/visibilidade: passaram.
- Teste unitario de autorizacao: criado.
- Suite completa: permanece com falhas nos cenarios de anexos existentes.
- `npm audit`: 6 vulnerabilidades, sendo 5 altas e 1 baixa; nenhuma correcao automatica aplicada.

## Limites

A migration e a migracao de dados nao foram executadas porque nao havia PostgreSQL local acessivel. O mock nao foi removido para nao deixar o sistema local indisponivel. A troca definitiva do frontend para a API e a substituicao integral das tabelas legadas requerem banco funcional, backup operacional e uma janela de migracao.

## Status da Sprint 1

**BLOQUEADA** pela indisponibilidade do PostgreSQL local e pelas falhas preexistentes de testes de anexos. A fundacao esta implementada de forma reproduzivel, mas os criterios de banco criado, migrations executadas, dados migrados e testes principais passando ainda nao podem ser declarados concluídos.
