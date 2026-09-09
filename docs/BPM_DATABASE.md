# Banco BPM

## Migration

A migration `0011_bpm_core.sql` cria a fundacao aditiva do BPM. Ela nao migra dados existentes e nao altera o frontend.

## Entidades

- `processes`: agregado de processo, unidade, criador, responsavel, status, fase atual e progresso.
- `process_phases`: fases relacionadas ao processo, com codigo, nome, ordem, status e progresso.
- `process_activities`: atividades relacionadas a fase, com codigo, titulo, descricao e status.
- `activity_responsibles`: relacao atividade/usuario, com quem atribuiu.
- `activity_checklists`: itens, obrigatoriedade, conclusao, usuario e data.
- `attachments`: metadados do arquivo e caminho fisico seguro; o binario nao fica no banco.
- `process_indicators`: indicadores vinculados ao processo.

## Relacionamentos

`processes 1:N process_phases`; `process_phases 1:N process_activities`; `process_activities 1:N activity_checklists`; `process_activities N:N users` por `activity_responsibles`; `processes 1:N attachments/process_indicators`.

## Integridade e seguranca

- Todos os IDs novos sao UUID.
- Processos exigem criador, unidade e status inicial.
- Responsaveis referenciam `users`; nomes nao sao fonte de verdade.
- Progresso de checklist e calculado por itens concluidos dividido pelo total.
- Repositories recebem o usuario e aplicam o escopo hierarquico para consultas de processos.
- Indices cobrem unidade, criador, status, fase, codigo e checklist concluido.

## Compatibilidade temporaria

`process_phases` e `process_activities` ja existiam para `processes_v2` e foram ampliadas com colunas canonicas. Novos processos usam o mesmo UUID em `processes` e `processes_v2` para manter o FK existente durante a transicao. Os 5 processos, 25 fases e 87 atividades preexistentes nao foram migrados nem reescritos nesta Sprint.

A Sprint 2.2 deve escolher uma unica tabela de processo, reconciliar os registros v2 e remover essa duplicidade antes de conectar o frontend.