# DATABASE CRUD VALIDATION REPORT

Data: 2026-09-02

## Ambiente

- Backend: Express.js
- Driver PostgreSQL: `pg`
- Aplicacao: `http://127.0.0.1:3000`
- Host seguro: `127.0.0.1`
- Porta PostgreSQL: `5432`
- Banco: `sge_pci`
- Usuario da aplicacao: `sge_app`
- Schema: `public`
- PostgreSQL: `PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35228, 64-bit`
- Modo: `USE_MOCK_API=false`

Nenhuma senha, JWT, token ou hash foi registrado neste relatorio.

## Endpoints usados

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/bpm/processes`
- `GET /api/bpm/processes/:id/phases`
- `PUT /api/bpm/processes/:id`

O mapa real de rotas nao possui endpoint `POST` para criar `process_phases` nem `process_activities`. Existem apenas endpoints de leitura para fases/atividades e update de atividades.

## Consultas SQL executadas

```sql
SELECT version(), current_database(), current_user, current_schema(), now();

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT COUNT(*) FROM processes;
SELECT COUNT(*) FROM process_phases;
SELECT COUNT(*) FROM process_activities;

SELECT id, name, description, status, current_phase, progress_percent
FROM processes
WHERE id = '6a43fd50-f07d-462e-944e-d5d2e8ea24b5';

SELECT id, name, status, current_phase
FROM processes
WHERE id = '6a43fd50-f07d-462e-944e-d5d2e8ea24b5';

SELECT COUNT(*)
FROM processes p
LEFT JOIN process_phases ph ON ph.process_id = p.id
WHERE ph.id IS NULL;

SELECT COUNT(*)
FROM process_activities pa
LEFT JOIN process_phases ph ON pa.phase_id = ph.id
WHERE ph.id IS NULL;

SELECT COUNT(*)
FROM processes
WHERE responsible_user_id IS NOT NULL
AND responsible_user_id NOT IN (SELECT id FROM users);
```

## Estado inicial

| Tabela | Registros |
|---|---:|
| `processes` | 2 |
| `process_phases` | 0 |
| `process_activities` | 0 |

Tabelas solicitadas encontradas no schema `public`:

- `processes`: EXISTS
- `process_phases`: EXISTS
- `process_activities`: EXISTS
- `users`: EXISTS
- `setores`: EXISTS

Tambem foram encontradas tabelas legadas `processos`, `atividades`, `subprocessos` e `usuarios`.

## Testes executados

### Health e conexao

- `GET /api/health`
- HTTP `200`
- Resposta: `{"status":"ok","database":"connected"}`

Resultado: PASS

### Login real

- `POST /api/auth/login`
- HTTP `200`
- JWT retornado: sim
- Usuario autenticado: UUID `00000000-0000-4000-8000-000000000011`
- Perfil: `NGE`

Resultado: PASS

### Criacao de processo pela aplicacao

- Endpoint: `POST /api/bpm/processes`
- HTTP `201`
- ID criado: `6a43fd50-f07d-462e-944e-d5d2e8ea24b5`
- Status retornado: `DRAFT`
- Nome de teste: `PROCESSO_TESTE_PRODUCAO_VALIDACAO_1788349980021`

Consulta direta no PostgreSQL retornou uma linha com o mesmo ID e nome.

Resultado: PASS

### Persistencia do processo

Registro encontrado diretamente em `processes`:

- `id`: `6a43fd50-f07d-462e-944e-d5d2e8ea24b5`
- `status`: `DRAFT`
- `current_phase`: `PLAN`
- `progress_percent`: `0.00`

Resultado: PASS

### Criacao e persistencia de fase

- `GET /api/bpm/processes/:id/phases`: HTTP `200`
- Quantidade retornada: `0`
- Endpoint de criacao: inexistente no mapa de rotas reais

Nao foi feita insercao direta no banco.

Resultado: FAIL

### Criacao e persistencia de atividade

Nao foi possivel executar pela aplicacao porque:

- nao existe endpoint real de criacao de fase;
- nao existe endpoint real de criacao de atividade no mapa `/api/bpm`;
- a consulta de atividades depende de uma fase existente.

Nao foi feita insercao direta no banco.

Resultado: FAIL / NAO EXECUTADO

### Update

Tentativa realizada pela aplicacao:

- Endpoint: `PUT /api/bpm/processes/6a43fd50-f07d-462e-944e-d5d2e8ea24b5`
- Campos enviados: status `IN_PROGRESS`, fase atual `ANALYZE`, responsavel do usuario autenticado
- HTTP: `500`
- Resposta: `{"error":"Erro interno do servidor."}`
- Consulta posterior no banco: processo permaneceu `DRAFT`, fase `PLAN`, responsavel `NULL`

Resultado: FAIL

### Restart e persistencia

Procedimento executado:

1. Instancia anterior encerrada.
2. Aplicacao iniciada novamente com `node src/server.js`.
3. Porta `3000` confirmou estado LISTENING.
4. `/api/health` retornou HTTP `200`.
5. Consulta direta no PostgreSQL encontrou novamente o processo criado.

Resultado: PASS

## Integridade

| Verificacao | Resultado real |
|---|---:|
| Processos sem fase | 3 |
| Atividades sem fase | 0 |
| Responsaveis invalidos | 0 |

Resultado: FAIL. O criterio exigido era zero registros orfaos/sem fase.

## Quadro final

| Teste | Resultado |
|---|---|
| Conexao PostgreSQL | PASS |
| Login | PASS |
| Criar Processo | PASS |
| Persistencia Processo | PASS |
| Criar Fase | FAIL |
| Persistencia Fase | FAIL |
| Criar Atividade | FAIL / NAO EXECUTADO |
| Persistencia Atividade | FAIL / NAO EXECUTADO |
| Update | FAIL |
| Restart | PASS |
| Integridade FK | FAIL |

## Classificacao final

# NO-GO PRODUCAO

## Bloqueadores comprovados

1. A aplicacao nao disponibiliza endpoint real para criar `process_phases`.
2. A aplicacao nao disponibiliza endpoint real para criar `process_activities`.
3. O processo criado pela aplicacao nao recebeu fase automaticamente: `process_phases` permaneceu com zero registros antes e a consulta da API retornou zero fases.
4. O update do processo retornou HTTP `500` e nao persistiu as alteracoes.
5. A integridade retornou 3 processos sem fase.

## Evidencia de que nao houve simulacao

- Nenhum `INSERT` foi executado diretamente para criar o processo, fase ou atividade.
- O processo foi criado exclusivamente por `POST /api/bpm/processes`.
- O ID foi consultado diretamente no PostgreSQL real usando `SELECT`.
- `pg-mem` nao foi usado nesta validacao.
- Nenhuma alteracao de codigo da aplicacao foi feita.
- Nenhuma correcao automatica foi feita.
