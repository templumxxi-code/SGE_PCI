# BPM DATABASE MODEL REPORT

Data: 2026-09-02. Evidência obtida por consulta no PostgreSQL real `sge_pci`, schema `public`.

## Tabelas

| Tabela | Existe | Registros observados |
|---|---|---:|
| `processes` | Sim | 3 |
| `processes_v2` | Sim | 1 |
| `process_phases` | Sim | 1 |
| `process_activities` | Sim | 1 |
| `process_members` | Sim | 0 |
| `activity_checklists` | Sim | 0 |
| `users` | Sim | 2 |
| `setores` | Sim | 2 |

## Relacionamentos confirmados

- `processes.id` e `processes_v2.id`: UUID, PK.
- `process_phases.process_id -> processes_v2.id`, FK, `NOT NULL`, `ON DELETE CASCADE`.
- `process_activities.phase_id -> process_phases.id`, FK, `NOT NULL`, `ON DELETE CASCADE`.
- `activity_checklists.activity_id -> process_activities.id`, FK, `NOT NULL`, `ON DELETE CASCADE`.
- `process_activities.responsible_user_id -> users.id`, FK.
- `process_members.process_id -> processes_v2.id`, FK.
- `process_members.user_id -> users.id`, FK.

## Constraints

- Todas as cinco tabelas BPM possuem PK UUID.
- `process_phases` possui UNIQUE `(process_id, phase_name)` e `(process_id, order_number)`.
- `process_activities` possui UNIQUE `(phase_id, codigo)`.
- `process_members` possui UNIQUE `(process_id, user_id)`.
- `processes` possui checks de status e progresso.
- `process_activities` possui check de progresso entre 0 e 100.

## Triggers

- Trigger real observado em `processes`: `trg_process_created_notification`, executando `notify_process_created()`.

## Evidência do fluxo validado

- Processo: `6a43fd50-f07d-462e-944e-d5d2e8ea24b5`.
- Fase: `a35eff1f-52d0-45f0-824a-c0bbfe5c0f28`, ligada ao processo acima.
- Atividade: `bf1378c7-0dc1-4bfc-b3a2-0f657356a81a`, ligada à fase acima.
- Responsável da atividade: usuário UUID `00000000-0000-4000-8000-000000000011`.

## Integridade

Na validação global, foram encontrados 2 processos sem fase. Atividades sem fase: 0. O registro criado pela Sprint possui vínculo correto processo → fase → atividade.
