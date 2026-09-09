# Matriz de requisitos BPM

| Fase | Atividade/codigo | Requisito | Obrigatorio | Fonte atual | Destino proposto |
|---|---|---|---|---|---|
| Planejar | PLAN_A | Equipe de melhoria | Sim | `PLANEJAR_REQUIREMENT_CATALOG`, equipe local | `process_members`/responsabilidades |
| Planejar | PLAN_B | Objetivo do projeto | Sim | `planejar.objetivo`, localStorage | campo estruturado da fase |
| Planejar | PLAN_C | Documentacao existente | Sim | anexo/campo local | `attachments` |
| Planejar | PLAN_D | DEIP e escopo | Sim | anexo/campo local | `attachments` + checklist |
| Planejar | PLAN_E | Plano de projeto | Sim | `planejar.plano_projeto`, localStorage | dados da fase + anexo |
| Planejar | PLAN_G | Aprovacao e ata | Sim | checklist local; validacao parcial | `approvals` + checklist + anexo |
| Analisar | ANAL_* | Checklist da atividade | Sim quando catalogado | localStorage | `activity_checklists` |
| Analisar | ANAL_* | DEIP, Anexos IV/V e relatorios | Conforme atividade | localStorage/storage | `attachments` |
| Desenhar | DES_* | Checklist e anexos I/IV/VI/VII/VIII | Conforme atividade | localStorage | `activity_checklists` + `attachments` |
| Implementar | IMPL_* | Checklist de implantacao | Sim quando criado | localStorage | `activity_checklists` |
| Monitorar | MON_* | Checklist, indicadores e evidencias | Conforme atividade | localStorage | `activity_checklists` + indicadores |

## Regras transversais

- Nome do processo, unidade e criador sao obrigatorios.
- Cada atividade pertence a uma fase e deve possuir codigo estavel.
- Checklist deve preservar item, obrigatoriedade, conclusao, usuario e data.
- Anexos devem preservar metadados e arquivo fisico seguro.
- Responsabilidades devem referenciar usuarios, nunca texto livre como fonte final.
- Requisitos devem ser versionados para preservar a regra BPM historica.