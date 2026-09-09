# Relatorio final da Sprint 2.2.2

Data: 2026-08-25

## Status

**CONCLUIDA** como camada API BPM inicial. A API foi criada sem alterar frontend, localStorage, telas, regras BPM ou migrar processos existentes.

## APIs e controllers

- `/api/bpm/processes`: criar, listar, consultar e atualizar processos.
- `/api/bpm/processes/:id/phases` e `/api/bpm/phases/:id`: fases.
- `/api/bpm/phases/:id/activities`, `/api/bpm/activities/:id`: atividades.
- `/api/bpm/activities/:id/checklist` e `/api/bpm/checklist/:id/complete`: checklist e progresso em cascata.
- `/api/bpm/activities/:id/responsibles`: responsaveis.
- `/api/bpm/activities/:id/attachments`: anexos e metadados.
- `/api/bpm/processes/:id/indicators` e `/api/bpm/indicators/:id`: indicadores.

Controllers criados em `src/controllers/bpm/` e rota agregadora em `src/routes/bpm.js`.

## Seguranca

Todas as rotas usam `verifyToken` e `authorize` com permissoes especificas. Processos sao consultados por UUID e `processRepository` aplica o escopo hierarquico. Fase e atividade sao validadas contra o processo acessivel antes de responder. Arquivos sao armazenados fora do banco e somente metadados vao para PostgreSQL.

## Auditoria

Foram adicionados eventos `PROCESS_CREATED`, `PROCESS_VIEWED`, `PROCESS_UPDATED`, `PHASE_VIEWED`, `ACTIVITY_VIEWED`, `ACTIVITY_UPDATED`, `CHECKLIST_COMPLETED`, `RESPONSIBLE_ASSIGNED`, `RESPONSIBLE_REMOVED`, `ATTACHMENT_UPLOADED`, `INDICATOR_CREATED` e `INDICATOR_UPDATED`.

## Migration

- `0012_bpm_api_permissions.sql`: permissoes da API BPM e associacoes aos roles.
- Migration aplicada com sucesso; execucao posterior nao encontrou pendencias.

## Testes

- `test/bpm-api.test.js`: login real, criacao de processo com `201`, consulta com `200`, UUID retornado e UUID invalido com `400`.
- `test/bpm-schema.test.js`: processo, fase, atividade e checklist UUID; conclusao persistida e progresso `100%`.
- Sintaxe dos controllers, rota e repositories: aprovada.

## Pendencias para Sprint 2.3

1. Criar fases e atividades automaticamente conforme o catalogo BPM oficial.
2. Migrar endpoints de frontend/legacy para consumir `/api/bpm`.
3. Migrar processos existentes com reconciliacao e rollback.
4. Completar testes de isolamento entre unidades, upload e indicadores.
5. Remover a duplicidade temporaria entre `processes` e `processes_v2`.
