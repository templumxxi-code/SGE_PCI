# Auditoria de fontes de dados da Sprint 2

Data: 2026-08-25

| Modulo | Fonte atual | Fonte final prevista | Estado |
|---|---|---|---|
| Usuarios/autenticacao | `storage/users.json` via `src/models/userStore.js`; fallback da tabela `usuarios` no middleware | PostgreSQL (`users`/roles) | Pendente |
| Processos | PostgreSQL legado (`processos`, `subprocessos`, `atividades`) nas rotas reais; `localStorage` e mock no frontend | PostgreSQL | Parcial |
| Checklist | `tarefas` e JSONB `planejar.checklist` no backend; `localStorage` em `public/js/processes.js` | PostgreSQL (`activity_checklists`) | Pendente |
| Responsaveis | `responsavel_id` em atividades/processos e estado local de equipe | PostgreSQL (`activity_responsibles`) | Pendente |
| Anexos | Metadados PostgreSQL legado e arquivos em `storage/attachments`; mock quando habilitado | PostgreSQL para metadados e storage seguro para arquivos | Parcial |
| Dashboard | Relatorios reais consultam PostgreSQL; calculos paralelos usam `sge_pci_processos` no localStorage | PostgreSQL | Parcial |
| Notificacoes | `localStorage['sge_pci_notifications']`; arrays em `mockApi` | PostgreSQL (`notifications`) | Pendente; nao existe rota real |
| Auditoria | Tabela legada `logs` em varias rotas; `audit_logs` canonica nao e usada | PostgreSQL (`audit_logs`) | Parcial |
| Mock API | `src/routes/mockApi.js` e `src/mockData.js`, ativados por `USE_MOCK_API=true` | Remover da operacao principal apos testes | Desativado no `.env`, ainda presente para testes |
| Preferencias | `localStorage` para tema, filtros e selecoes de interface | Pode permanecer no frontend | Permitido |

## Rotas reais identificadas

- Processos: `GET/POST/PUT/DELETE /api/processes`.
- Checklist: `PATCH /api/checklist/:id`.
- Relatorios: `/api/reports/processos`, `/api/reports/indicadores` e `/api/reports/dashboard`.
- Anexos: rotas em `src/routes/attachments.js`.
- Usuarios: rotas em `src/routes/auth.js`.
- Notificacoes: nenhuma rota real encontrada.

## Riscos encontrados

1. Existem tres fontes concorrentes para usuarios: JSON local, tabela legada `usuarios` e tabela canonica `users`.
2. O frontend calcula progresso a partir de `sge_pci_processos`, enquanto o backend atualiza `tarefas`/`planejar`, permitindo divergencia apos refresh.
3. A migration `0006` criou tabelas canonicas com sufixo `_v2`, mas as rotas atuais continuam usando tabelas legadas.
4. O middleware de autenticacao ainda possui fallback para `users.json`, o que pode mascarar indisponibilidade ou erro do banco.
5. Notificacoes institucionais nao chegam ao banco nem possuem endpoint real.
6. `GET /api/reports/logs` e consumido pelo frontend, mas nao esta implementado nas rotas reais.

## Estrategia de migracao

O primeiro slice vertical deve migrar login, leitura de usuario e cadastro para um repositorio PostgreSQL transacional, com importacao idempotente do JSON e bcrypt. Depois disso, o fallback para arquivo deve ser removido do caminho de producao. Processos/checklists devem seguir no modelo legado inicialmente para evitar duas escritas concorrentes, e somente depois ser mapeados para o schema canonico.
