# PROCESS DATA ROOT CAUSE

## Evidência

- Os processos órfãos existiam em `processes`.
- Eles não existiam em `processes_v2`.
- `process_phases.process_id` possui FK para `processes_v2.id`.
- O fluxo moderno de criação em `src/repositories/bpm/processRepository.js` cria simultaneamente `processes` e `processes_v2`.
- O código legado cria registros em `processes` sem criar o espelho moderno.

## Causa raiz

Os dois processos foram criados por fluxo legado/parcial antes da consolidação do modelo moderno. A ausência de `processes_v2` impedia a criação da fase porque a FK real de `process_phases` aponta para `processes_v2`.

## Evidência de correção

A aplicação passou a reconciliar, de forma idempotente, o espelho moderno a partir do registro real existente antes de criar a fase. A reconciliação mapeia `ACTIVE` para `EM_ANDAMENTO` e preserva ID, nome, unidade, criador e responsável.

A correção foi executada pela API autenticada. Nenhum registro foi apagado e nenhum INSERT manual foi utilizado.
