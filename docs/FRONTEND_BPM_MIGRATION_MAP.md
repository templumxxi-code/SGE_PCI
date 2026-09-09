# Mapa de migracao do frontend BPM

Data: 2026-08-25

| Area | Fonte anterior | Fonte atual | Estado |
|---|---|---|---|
| Meus Processos | `localStorage['sge_pci_processos']` | `GET /api/bpm/processes` + detalhe por processo | API por padrao |
| Criacao | `ProcessManager.createProcess` local | `POST /api/bpm/processes` | Migrado |
| Edicao | objeto local | `PUT /api/bpm/processes/:id` | Cliente criado; tela em transicao |
| Fases | objeto `phases` local | `GET /api/bpm/processes/:id/phases` | API disponivel |
| Atividades | objeto local | `GET /api/bpm/phases/:id/activities` | API disponivel |
| Checklist | checklist local | `GET/PATCH /api/bpm/activities/:id/checklist` | Escrita migrada para itens UUID |
| Anexos | armazenamento/local e rotas antigas | `POST/GET /api/bpm/activities/:id/attachments` | Cliente criado |
| Responsaveis | campos/equipe local | `GET/POST/DELETE /api/bpm/activities/:id/responsibles` | Cliente criado |
| Dashboard | `buildDashboardFromLocalProcesses` | endpoint real de relatorios | Caminho local removido |
| Relatorios | API real com token local | API real | Mantido |
| Tema/filtros | `localStorage` | `localStorage` | Permitido |

## Compatibilidade

`BPM_DATA_SOURCE` pode ser definido como `API` ou `LOCAL` antes dos scripts da aplicacao. O padrao e `API`. Em API, processos ficam em memoria para compatibilidade de renderizacao e nao sao gravados em `sge_pci_processos`. O localStorage antigo nao e apagado, permitindo rollback.

## Riscos restantes

- Algumas funcoes profundas do ProcessManager ainda esperam o formato legado de campos.
- Uploads especificos de Planejar continuam usando rotas antigas.
- O dashboard real ainda e baseado nos relatorios legados do backend, embora nao leia mais o localStorage no frontend.
- O cliente usa token em localStorage porque esse e o contrato atual de autenticacao; migracao para cookie HttpOnly e etapa posterior.