# Modelo de banco BPM alvo

## Entidades

- `processes`: nome, descricao, unidade, criador, responsavel, status, fase atual e datas.
- `process_phases`: processo, nome, ordem, status e progresso derivado.
- `process_activities`: fase, codigo, titulo, descricao, responsavel e status.
- `activity_checklists`: atividade, descricao, obrigatoriedade, conclusao, usuario e data.
- `activity_responsibles`: atividade, usuario, processo, responsabilidade e vigencia.
- `attachments`: processo, atividade, nome original, nome armazenado, caminho, tipo, usuario e data.
- `indicators`: processo/atividade, nome, meta, valor, tipo e periodicidade.
- `approvals`: processo, etapa, aprovador, status, comentario e datas.
- `audit_logs`: usuario, acao, modulo, registro, valores e IP.

## Relacionamentos

`processes 1:N process_phases`; `process_phases 1:N process_activities`; `process_activities 1:N activity_checklists`; `process_activities N:N users` por `activity_responsibles`; `processes 1:N attachments/indicators/approvals`.

## Decisao de compatibilidade

O modelo v2 existente (`processes_v2`, `process_phases`, `process_activities`, `checklist_items`) e o candidato mais proximo do alvo, mas deve ser renomeado/mapeado por uma migration controlada para os nomes finais. Nao devem coexistir duas fontes de escrita.

## Integridade

UUID em todas as entidades, FKs com cascata controlada, codigos unicos por fase, uma responsabilidade por usuario/atividade/processo, checklist derivando progresso e metadados de anexos sem guardar conteudo binario no banco.