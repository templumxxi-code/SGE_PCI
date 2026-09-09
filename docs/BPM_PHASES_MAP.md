# Mapa de fases BPM

## Catalogo oficial

| Ordem | Fase | Fonte atual | Regra observada |
|---:|---|---|---|
| 1 | Planejar | `BPM_ACTIVITY_SEQUENCE`, `planejar` | Requer objetivo, SWOT, cronograma, equipe e plano; possui atividades `PLAN_A` a `PLAN_G`. |
| 2 | Analisar | templates do frontend e atividades locais | Checklist e documentos de analise devem estar completos conforme atividade. |
| 3 | Desenhar | templates do frontend | Checklist e anexos de desenho sustentam a conclusao. |
| 4 | Implementar | templates do frontend | Checklist de implementacao e entregas sustentam a conclusao. |
| 5 | Monitorar | templates do frontend | Checklist e indicadores sustentam o acompanhamento. |

## Planejar

O backend cria idempotentemente: `PLAN_A`, `PLAN_B`, `PLAN_C`, `PLAN_D`, `PLAN_E` e `PLAN_G`.

- `PLAN_A`: Definir equipe de melhoria.
- `PLAN_B`: Estabelecer objetivo do projeto.
- `PLAN_C`: Solicitar documentacao existente.
- `PLAN_D`: Diagrama de Escopo e Interface (DEIP).
- `PLAN_E`: Elaborar Plano de Projeto.
- `PLAN_G`: Aprovar Plano do Projeto.

Existe divergencia historica no modulo `public/js/planejar.js`, que inverte A/B. `migratePlanejarABContentSwap` tenta corrigir dados antigos. A migracao deve preservar o codigo, registrar a versao do contrato e nao inferir a troca silenciosamente.

## Regras de conclusao

A submissao Planejar exige os blocos de conteudo definidos no controller. O frontend tambem exige campos, checklists e anexos conforme `PLANEJAR_REQUIREMENT_CATALOG`. O backend ainda nao valida integralmente checklist de aprovacao e anexos obrigatorios.

## Divergencias a resolver antes da migracao

- Padronizar `Desenhar`; `Redesenhar` aparece em schema legado.
- Consolidar os catalogos 0002/0003/0004.
- Definir um contrato unico para status, ordem e codigo de atividade.
- Transformar requisitos atualmente calculados no frontend em registros versionados no banco.