# BPM FLOW CURRENT STATE

Data: 2026-09-02
Banco observado: PostgreSQL real `sge_pci`, schema `public`.

## Backend

- Controllers: `src/controllers/bpm/processController.js`, `phaseController.js`, `activityController.js`, `responsibleController.js`, `checklistController.js`.
- Repositories: `src/repositories/bpm/processRepository.js`, `phaseRepository.js`, `activityRepository.js`, `responsibleRepository.js`, `checklistRepository.js`.
- Routes: `src/routes/bpm.js`.
- Middlewares: `verifyToken` e `authorize`.
- Dashboard: `src/routes/dashboard.js` e `src/routes/strategicReports.js`.

## Endpoints

| Recurso | Endpoint | Existe? | Banco utilizado |
|---|---|---|---|
| Processo | `POST /api/bpm/processes` | Sim | PostgreSQL `processes` e `processes_v2` |
| Processo | `GET /api/bpm/processes`, `GET /api/bpm/processes/:id` | Sim | PostgreSQL |
| Processo | `PUT /api/bpm/processes/:id` | Sim | PostgreSQL `processes` |
| Fase | `POST /api/bpm/processes/:processId/phases` | Implementado nesta Sprint | PostgreSQL `process_phases` |
| Fase | `GET /api/bpm/processes/:id/phases`, `GET /api/bpm/phases/:id` | Sim | PostgreSQL |
| Atividade | `POST /api/bpm/phases/:phaseId/activities` | Implementado nesta Sprint | PostgreSQL `process_activities` |
| Atividade | `GET /api/bpm/phases/:id/activities`, `GET /api/bpm/activities/:id` | Sim | PostgreSQL |
| Atividade | `PUT /api/bpm/activities/:id` | Sim | PostgreSQL |
| Responsável | `GET/POST/DELETE /api/bpm/activities/:id/responsibles` | Sim | PostgreSQL `activity_responsibles` |
| Checklist | `GET /api/bpm/activities/:id/checklist` | Sim | PostgreSQL `activity_checklists` |
| Checklist | `PATCH /api/bpm/checklist/:id/complete` | Sim | PostgreSQL `activity_checklists` |
| Alertas | Rotas BPM dedicadas | Não localizadas | Há tabela/fluxo legado separado |
| Dashboard | `GET /api/dashboard/summary` | Sim | PostgreSQL BPM |

## Estado observado antes da Sprint

- `processes`: 2
- `process_phases`: 0
- `process_activities`: 0
- Processo moderno já era criado pela API, mas sem fase.
- O update enviando `IN_PROGRESS` retornava HTTP 500 porque o domínio real aceita `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`.

## Alterações desta Sprint

- Conectada criação de fases à rota protegida por autenticação e `PROCESS_UPDATE`.
- Conectada criação de atividades à rota protegida por autenticação e `PROCESS_UPDATE`.
- Responsável de atividade passou a ser persistido.
- Update de processo passou a persistir `progress_percent`.
- Status e progresso passaram a ser validados antes do SQL.
