# Relatorio de finalizacao da Sprint 1

Data: 2026-08-25

## Estado da entrega

A Sprint 1 ainda nao pode ser considerada concluida. O backend possui um pool PostgreSQL funcional, migrations versionadas, autenticacao com bcrypt/JWT, controle de acesso e endpoint `GET /api/health`, mas a persistencia de usuarios em producao ainda usa `storage/users.json` e parte do frontend ainda usa `localStorage` como fonte de dados.

## Alteracoes realizadas nesta etapa

- O startup valida `SELECT 1` no PostgreSQL antes de abrir o servidor, exceto quando `USE_MOCK_API=true`.
- O health check retorna `status: "ok"`/`database: "connected"` ou `status: "error"`/`database: "disconnected"`.
- A configuracao prioriza `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` e `DATABASE_PASSWORD`.
- Os defaults deixam de usar a conta administrativa `postgres` e passam a apontar para `sge_pci`/`sge_app`.
- O exemplo de ambiente foi atualizado para o banco e usuario oficiais.

## Migrations

As migrations existentes foram identificadas de `0001` a `0006`. A `0006` cria uma fundacao canonica com RBAC, processos, atividades, anexos, aprovacoes, notificacoes e auditoria.

O banco `sge_pci` e o usuario restrito `sge_app` foram criados na porta `5432`. As 6 migrations foram executadas com sucesso; uma nova execucao retornou zero migrations pendentes.

## Testes realizados

- `node --check src/models/db.js`: aprovado.
- `node --check src/server.js`: aprovado.
- `npm test`: iniciou a suite funcional e confirmou o modo mock; a captura nao apresentou o resumo final.
- Conectividade TCP com `localhost:5432`: disponivel.
- Conexao autenticada pelo driver `pg` como administrador e como usuario de aplicacao: aprovada.
- `GET /api/health` no servidor real: `200`, `ok`, `connected`.

## Pendencias para concluir a Sprint 1

1. Migrar `userStore` de `storage/users.json` para PostgreSQL.
2. Ligar processos, atividades, checklists, anexos e equipe as tabelas canonicas, removendo fontes de dados temporarias.
3. Criar sessoes persistentes, `user_roles` e as tabelas organizacionais exigidas, ou documentar a equivalencia com o schema canonico atual.
4. Adicionar testes de migration, rollback e persistencia real.

## Proxima sprint

Concluir a migracao dos stores e rotas para o schema canonico, executar a carga inicial de usuarios e unidades e ampliar a cobertura de testes de autorizacao e auditoria.