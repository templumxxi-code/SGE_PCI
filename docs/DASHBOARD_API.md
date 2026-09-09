# API estrategica de dashboards e relatorios

## Dashboards

- `GET /api/dashboard/summary`: resumo de processos, atividades e progresso.
- `GET /api/dashboard/nge`: visao global, exige `DASHBOARD_GLOBAL`.
- `GET /api/dashboard/unit`: visao da unidade e descendentes, exige `PROCESS_VIEW`.

O escopo e obtido do usuario autenticado. Filtros nao podem ampliar a unidade permitida.

## Relatorios

- `GET /api/reports/process-summary`.
- `GET /api/reports/unit-performance`.
- `GET /api/reports/activity-performance`.

Relatórios aceitam `status`, `phase`, `unit_id`, `responsible_user_id`, `data_inicio` e `data_fim`. `unit_id` só é considerado para usuário global; os demais usuários permanecem limitados à própria hierarquia.

`unit_id` so e considerado para usuario global; demais usuarios usam a hierarquia da propria lotacao.

## Resposta

Dashboards retornam contagens de processos, status, fases, atividades e progresso medio. A data de geracao e incluida. Consultas usam PostgreSQL e parametros preparados.

## Atualizacao

O frontend consulta dashboards por polling de 30 segundos. Falhas preservam o estado visual anterior e nao transformam o cache local em fonte oficial.
