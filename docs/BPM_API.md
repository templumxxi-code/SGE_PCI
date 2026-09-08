# API BPM

A API oficial desta etapa fica sob `/api/bpm` e usa `verifyToken`, `authorize` e repositories PostgreSQL. As rotas legadas permanecem disponíveis para compatibilidade e nao foram removidas.

## Processos

- `POST /api/bpm/processes`: cria processo. Permissao `PROCESS_CREATE`. Campos: `name`, `description`, `organizational_unit_id` e `responsible_user_id` opcional.
- `GET /api/bpm/processes`: lista processos no escopo hierarquico. Permissao `PROCESS_VIEW`.
- `GET /api/bpm/processes/:id`: consulta processo UUID. Permissao `PROCESS_VIEW`.
- `PUT /api/bpm/processes/:id`: atualiza descricao, responsavel, status e fase. Permissao `PROCESS_UPDATE`.

## Fases e atividades

- `GET /api/bpm/processes/:id/phases`: lista fases.
- `GET /api/bpm/phases/:id`: consulta fase.
- `GET /api/bpm/phases/:id/activities`: lista atividades.
- `GET /api/bpm/activities/:id`: consulta atividade.
- `PUT /api/bpm/activities/:id`: atualiza atividade.

Todas exigem `PROCESS_VIEW`, e atualizacao exige `PROCESS_UPDATE`. O contexto valida que fase e atividade pertencem a processo acessivel.

## Checklist

- `GET /api/bpm/activities/:id/checklist`: lista itens.
- `PATCH /api/bpm/checklist/:id/complete`: recebe `{ "completed": true }`, grava usuario/data e recalcula atividade, fase e processo. Permissao `CHECKLIST_UPDATE`.

## Responsaveis

- `GET /api/bpm/activities/:id/responsibles`
- `POST /api/bpm/activities/:id/responsibles` com `user_id`
- `DELETE /api/bpm/activities/:id/responsibles/:userId`

A API referencia usuarios por UUID e rejeita responsaveis fora do escopo.

## Anexos

- `POST /api/bpm/activities/:id/attachments` multipart com campo `file`.
- `GET /api/bpm/activities/:id/attachments`.

O arquivo fica em `storage/attachments/bpm`; o PostgreSQL guarda metadados e caminho. Sao aceitos PDF, PNG e JPEG ate 10 MB.

## Indicadores

- `GET /api/bpm/processes/:id/indicators`
- `POST /api/bpm/processes/:id/indicators`
- `PUT /api/bpm/indicators/:id`

Criacao e alteracao exigem `INDICATOR_MANAGE`; leitura exige `PROCESS_VIEW`.

## Auditoria e seguranca

As rotas exigem JWT valido, sessao ativa, permissao RBAC e escopo hierarquico. Eventos como `PROCESS_CREATED`, `PROCESS_VIEWED`, `CHECKLIST_COMPLETED`, `ATTACHMENT_UPLOADED` e alteracoes de atividade sao gravados em `audit_logs` sem senha ou token.
