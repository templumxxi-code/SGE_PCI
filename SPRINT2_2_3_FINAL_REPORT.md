# Relatorio final da Sprint 2.2.3

Data: 2026-08-25

## Status

**CONCLUIDA** como migracao gradual e reversivel da fonte principal do frontend BPM.

## Alteracoes realizadas

- Criado `public/js/api/bpmApi.js` para centralizar chamadas REST, token, FormData e erros.
- Incluido o cliente API no `public/index.html` antes de `processes.js`.
- `ProcessManager.loadProcesses` usa API por padrao, hidrata detalhes e mantem estado em memoria.
- `ProcessManager.createProcess` usa `POST /api/bpm/processes`.
- Processos nao sao mais gravados no localStorage quando `BPM_DATA_SOURCE=API`.
- Conclusao de checklist UUID usa `PATCH /api/bpm/checklist/:id/complete`.
- Dashboards deixaram de retornar pelo caminho local e consultam o endpoint real de relatorios.
- IDs UUID deixaram de ser convertidos com `parseInt` nos handlers de detalhe.
- Fallback local permanece disponivel somente para indisponibilidade ou `BPM_DATA_SOURCE=LOCAL`.

## Arquivos

- `public/js/api/bpmApi.js`
- `public/index.html`
- `public/js/processes.js`
- `public/js/dashboard.js`
- `docs/FRONTEND_BPM_MIGRATION_MAP.md`
- `docs/FRONTEND_BPM_API.md`
- `test/bpm-api.test.js`

## Testes

- Sintaxe de `bpmApi.js`, `processes.js` e `dashboard.js`: aprovada.
- `npm run test:bpm-api`: 2 testes aprovados.
- Criacao via API: `201`.
- Consulta via API: `200`.
- UUID invalido: `400`.

## Reversibilidade

O valor padrao e `API`. Para rollback temporario, definir `window.BPM_DATA_SOURCE = 'LOCAL'` antes de carregar os scripts. O localStorage existente nao foi apagado.

## Pendencias para Sprint 2.2.4

1. Substituir funcoes profundas de edicao/detalhe que ainda modelam campos legados.
2. Migrar uploads especificos do Planejar para o cliente BPM novo.
3. Migrar indicadores e responsaveis das telas existentes para as chamadas centralizadas.
4. Remover o fallback local somente apos reconciliacao e aceite operacional.
5. Fazer o dashboard consumir uma API BPM canônica, não o relatório legado.
