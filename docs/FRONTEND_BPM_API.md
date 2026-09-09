# Frontend BPM API

## Cliente

`public/js/api/bpmApi.js` centraliza `fetch`, `Authorization: Bearer`, erros HTTP e `FormData`. O cliente nao conhece regra de negocio nem grava dados institucionais localmente.

## Fonte de dados

`BPM_DATA_SOURCE=API` e o padrao. Nesse modo, `ProcessManager.loadProcesses` usa `GET /api/bpm/processes` e hidrata cada registro por `GET /api/bpm/processes/:id`. A lista e mantida em memoria apenas para compatibilidade com a renderizacao atual. O cache antigo de localStorage permanece intacto para rollback.

`BPM_DATA_SOURCE=LOCAL` reativa o fluxo anterior explicitamente.

## Operacoes

- Processos: `getProcesses`, `getProcessById`, `createProcess`, `updateProcess`.
- Fases/atividades: `getPhases`, `getPhaseById`, `getActivities`, `getActivityById`, `updateActivity`.
- Checklist: `getChecklist`, `completeChecklistItem`.
- Responsaveis: `getResponsibles`, `addResponsible`, `removeResponsible`.
- Anexos: `uploadAttachment`, `getAttachments`.
- Indicadores: `getIndicators`, `createIndicator`, `updateIndicator`.

## Erros e offline

Respostas nao-2xx geram erro com `status` e mensagem da API. O carregamento de processos tenta fallback local se a API estiver indisponivel, preservando a reversibilidade da migracao; a interface existente recebe o erro para notificacao nas operacoes de escrita.

## Seguranca

O token e anexado automaticamente. IDs e unidades enviados pelo navegador sao apenas solicitacoes: o backend valida UUID, RBAC, existencia e escopo hierarquico. Nenhuma permissao e confiada ao cliente.