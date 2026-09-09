# Relatorio final da Sprint 2

Data: 2026-08-25

## Status

**BLOQUEADA**

O banco PostgreSQL esta configurado e os dados locais foram carregados no schema canonico, mas o backend ainda possui stores e fluxos legados. Portanto, o criterio de corte definitivo do mock e do JSON/localStorage nao foi atingido.

## Arquivos alterados ou criados

- `src/models/db.js`: restringe `TEST_DATABASE_URL` a execucoes de teste.
- `src/database/migrator.js`: aplica `database/schema.sql` como baseline apenas em banco vazio.
- `scripts/setup-postgres.js`: cria/configura `sge_app` e `sge_pci` sem senha fixa no arquivo.
- `scripts/configure-database-env.js`: configura as chaves `DATABASE_*` e desativa o mock.
- `docs/SPRINT2_DATA_AUDIT.md`: inventario das fontes concorrentes.
- `docs/SPRINT1_FINALIZATION_REPORT.md`: atualizado com o estado real do banco.

## Banco e migrations

- PostgreSQL em `127.0.0.1:5432`.
- Banco `sge_pci` criado.
- Usuario de aplicacao `sge_app` criado.
- Migrations `0001` a `0006` executadas; nova execucao retornou zero pendencias.
- `npm run migrate:local` executado com sucesso.
- Backup dos dados locais criado em `storage/backups`.

## Tabelas utilizadas

O schema canonico possui `users`, `roles`, `permissions`, `organizational_units_v2`, `processes_v2`, `process_phases`, `process_activities`, `checklist_items`, `process_members`, `attachments_v2`, `approvals`, `notifications` e `audit_logs`.

As rotas atuais ainda utilizam tambem as tabelas legadas `usuarios`, `processos`, `subprocessos`, `atividades`, `tarefas`, `anexos` e `logs`.

## APIs e validacoes

- `GET /api/health` real validado com `200`, `ok` e `connected`.
- Rotas reais de autenticacao e processos continuam disponiveis.
- Nenhuma API real de notificacoes foi criada nesta etapa.

## Testes executados

- Sintaxe de `src/models/db.js`, `src/server.js` e `src/config/config.js`: aprovada.
- Conexao administrativa e de aplicacao ao PostgreSQL: aprovada.
- Migrations: aprovadas.
- Migracao local: aprovada.
- Health check real: aprovado.
- A suite funcional foi iniciada anteriormente, mas nao ha resumo final confiavel registrado nesta execucao.

## Riscos e vulnerabilidades encontradas

1. `src/models/userStore.js` ainda usa `storage/users.json` como fonte de autenticacao e cadastro.
2. O middleware de autenticacao ainda possui fallback para o arquivo local quando a consulta legada falha.
3. O frontend ainda usa `localStorage` para processos, indicadores, checklists e notificacoes institucionais.
4. O frontend possui calculo de progresso diferente do backend, com risco de divergencia apos refresh.
5. A tabela canonica `audit_logs` nao e usada pelas rotas legadas; a auditoria continua em `logs`.
6. Nao existe endpoint real para `GET /api/notifications`.
7. O migrador existente gera senha temporaria quando a origem nao possui senha; esses usuarios devem trocar a senha antes do uso institucional.

## Pendencias para Sprint 3

- Migrar o repositorio de usuarios para PostgreSQL e remover fallback JSON.
- Escolher um unico schema para processos e adaptar controllers, autorizacao e testes.
- Persistir checklist e responsaveis em tabelas canonicas.
- Implementar notificacoes e auditoria reais via API.
- Remover localStorage como fonte de dados institucionais.
- Executar a suite completa com banco de teste isolado e registrar o resumo.
