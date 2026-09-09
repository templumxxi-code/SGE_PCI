# Auditoria do estado atual do BPM

Data: 2026-08-25

## Arquitetura atual

O fluxo principal exibido pelo frontend e:

`public/js/processes.js` -> `localStorage['sge_pci_processos']` -> objeto BPM local.

O backend real usa outro fluxo:

`/api/processes` -> `src/controllers/processController.js` -> PostgreSQL legado (`processos`, `subprocessos`, `atividades`, `tarefas`, `anexos`, `planejar`).

Existe ainda um terceiro modelo criado pela migration Sprint 1:

`processes_v2` -> `process_phases` -> `process_activities` -> `checklist_items`, com `process_members`, `attachments_v2`, `approvals` e `audit_logs`; os controllers BPM atuais não o utilizam.

## Componentes inventariados

- Criacao/edicao/exclusao: `ProcessManager.createProcess`, `updateProcess`, `deleteProcess`; atualmente local.
- Fases/atividades: `BPM_ACTIVITY_SEQUENCE`, `getBpmPhaseTemplates`, `ensurePlanejarCreated`, `syncPlanejarActivities`.
- Checklist/progresso: `getActivityChecklistMetrics`, `calculatePhaseProgress`, `calculateProcessProgress`, `PATCH /api/checklist/:id`.
- Equipe: `handleParticipantAddFromDetail`, `handleParticipantSaveFromDetail`, `planejarController.adicionarEquipeMembro`.
- Anexos: `attachmentController`, `planejar.js` e storage fisico.
- Dashboards/relatorios: `dashboard.js`, `reports.js`; fontes local e legado concorrentes.
- Submissao/aprovacao: `submitPlanejar`, aprovar/devolver em `planejarController`.

## Campos obrigatorios observados

Processo: nome, setor e macroprocesso. Planejar: objetivo, SWOT, cronograma, equipe e objetivo do plano. Cronograma exige atividade e datas. Equipe exige nome. Upload exige arquivo, MIME/extensao, assinatura valida e ate 10 MB.

## Riscos principais

1. Acoes CRUD principais do frontend nao persistem na API.
2. Progresso local e backend podem divergir.
3. Schema v2 nao esta conectado aos controllers.
4. Migrations Planejar 0002, 0003 e 0004 possuem modelos sobrepostos.
5. Tipos de anexos do modulo (`DEIP`, `PLANO`, `ATA`, `Cronograma`) nao coincidem com o vocabulario legado (`POP`, `PAP`, `BPMN`, `Outro`).
6. Ha rotas Planejar cujo parametro nao atende a assinatura do controller.

## Conclusao

A fonte canonica futura deve ser PostgreSQL. A migracao deve iniciar por um contrato de leitura/escrita unico e uma carga controlada do localStorage, com backup e reconciliacao antes de desativar a fonte local.