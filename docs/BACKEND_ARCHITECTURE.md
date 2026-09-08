# Backend Architecture - Sprint 1

## Arquitetura

A arquitetura alvo e:

`Frontend -> API Express -> PostgreSQL`

O Express continua servindo os arquivos estaticos, mas a fonte oficial de dados deve ser a API. O mock permanece somente como modo de desenvolvimento temporario (`USE_MOCK_API=true`) ate a infraestrutura PostgreSQL estar disponivel.

- `src/routes`: contrato HTTP e middleware da rota.
- `src/controllers`: adaptacao entre HTTP e casos de uso existentes.
- `src/services`: regras de acesso, roles, Planejar e PDF.
- `src/models`: pool PostgreSQL e compatibilidade com armazenamento legado.
- `src/database/migrator.js`: runner transacional e idempotente de migrations.
- `database/migrations`: alteracoes versionadas.
- `scripts/migrate-local-data.js`: importacao nao destrutiva do mock para o schema canonico.

A base legada continua em `src/controllers` e usa tabelas legadas em portugues para preservar o ciclo BPM. A migration `0006_sprint1_foundation.sql` cria o contrato canonico em tabelas novas com sufixo `_v2` quando o nome legado ja existe; a migracao de dados e a troca de consumidores devem ocorrer em uma etapa controlada posterior.

## Banco

O schema canonico inclui roles, permissions, roles_permissions, users, organizational_units_v2, processes_v2, process_phases, process_activities, checklist_items, process_members, attachments_v2, approvals, approval_history, notifications e audit_logs.

As tabelas de auditoria nao concedem UPDATE/DELETE a PUBLIC. A migration tambem cria indices de escopo e auditoria e seeds somente de codigos de role/permissao, sem senhas.

## Migrations

Executar com PostgreSQL configurado:

```text
npm run migrate
```

O runner cria `schema_migrations`, executa arquivos SQL em ordem lexicografica dentro de uma transacao e registra cada versao. Nao executar migrations manualmente fora do runner.

## APIs

APIs novas da fundacao:

- `GET /api/health`: consulta `SELECT 1`; responde `200` com `database=connected` ou `503` com `database=disconnected`.
- `GET /api/users`: NGE; nunca retorna `senha_hash`.
- `POST /api/users`: NGE; gera bcrypt hash e exige senha minima.
- `GET /api/users/:id`: NGE ou o proprio usuario.
- `PATCH /api/users/:id`: usuario pode alterar dados basicos proprios; somente NGE pode alterar perfil, lotacao e ativo.
- `GET /api/organization/tree`: usuario autenticado; retorna arvore de unidades ativas.
- `PATCH /api/checklist/:id`: usuario autenticado do mesmo setor ou NGE; atualiza conclusao e registra log.
- `POST /api/auth/logout`: atualiza `ultimo_logout_em` e invalida tokens anteriores no caminho PostgreSQL.

As APIs existentes de processos, Planejar, indicadores, relatorios e anexos permanecem para nao alterar o ciclo BPM nesta sprint.

## Autenticacao

O fluxo PostgreSQL existente valida hash bcrypt, usuario ativo e JWT. O middleware consulta o usuario no banco e verifica `ultimo_logout_em`. O token ainda e enviado pelo frontend via Bearer durante a transicao; a migracao para cookie HttpOnly/Secure deve ser feita antes de producao.

## Autorizacao

A decisao de escopo deve ocorrer no backend. NGE possui visao global; usuarios setoriais ficam limitados ao setor. A rota de usuarios usa whitelist para impedir autoalteracao de perfil/lotacao. A matriz hierarquica detalhada do frontend ainda precisa ser alinhada ao RBAC canonico antes do GO.

## Migracao

Depois de aplicar migrations:

```text
npm run migrate:local
```

O script cria backup de `storage/users.json` em `storage/backups/`, faz inserts/upserts sem apagar a origem e importa usuarios, setores, processos, fases, atividades e checklists. Ele deve ser executado uma vez por ambiente controlado, com credenciais temporarias e troca obrigatoria no primeiro acesso.
