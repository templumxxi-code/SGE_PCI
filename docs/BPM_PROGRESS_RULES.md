# Regras de progresso BPM

## Regra alvo

O progresso de uma atividade e:

`itens de checklist concluidos / total de itens de checklist * 100`.

O progresso da fase e a agregacao dos itens das atividades da fase. O progresso do processo e a agregacao global de todos os itens de checklist. Quando nao houver itens, o registro deve permanecer como `0`, sem considerar abertura, clique ou status manual.

## Estado atual

- `public/js/processes.js` calcula progresso localmente em `calculateActivityProgress`, `calculatePhaseProgress` e `calculateProcessProgress`.
- Planejar mistura checklist com requisitos de campos e anexos.
- O backend le `percentual_conclusao` e estruturas `planejar`/`tarefas`, mas nao recalcula de forma unica.
- Ha implementacoes redundantes para atividades Planejar.

## Contrato futuro

- `activity_checklists` e a fonte de verdade dos itens.
- Cada alteracao de item atualiza `completed_by`, `completed_at` e recalcula a atividade em transacao.
- A API retorna progresso derivado do banco; nenhum percentual recebido do cliente e confiavel.
- Processo/fase nao devem aceitar edicao manual de percentual.
- Testes devem validar 0/total, parcial, 100% e persistencia apos novo acesso.