# Database Schema - Sprint 1

## Convencoes

- Chaves canonicas usam UUID gerado por `gen_random_uuid()`.
- Datas usam `TIMESTAMPTZ` e nomes em ingles no schema novo.
- Senhas existem somente como `password_hash`.
- Arquivos fisicos ficam fora do banco; o banco guarda metadata e nome UUID.
- Auditoria e historico sao append-only por politica de aplicacao e privilegios SQL.

## Tabelas e relacionamentos

- `roles`: perfis institucionais.
- `permissions`: permissoes atomicas.
- `roles_permissions`: N:N entre perfis e permissoes.
- `users`: identidade, hash, perfil e lotacao.
- `organizational_units_v2`: arvore de instituto, regional, assessoria, nucleo e setor por `parent_id`.
- `processes_v2`: processo, unidade, criador, responsavel, fase atual e status.
- `process_phases`: cinco fases BPM por processo, com ordem unica.
- `process_activities`: atividades de cada fase, codigo unico dentro da fase e progresso limitado a 0-100.
- `checklist_items`: itens da atividade, obrigatoriedade, conclusao, autor e data.
- `process_members`: equipe e responsabilidade por processo.
- `attachments_v2`: metadata de anexos e referencias a processo/atividade/usuario.
- `approvals`: etapa e decisao atual de aprovacao.
- `approval_history`: historico imutavel das acoes de aprovacao.
- `notifications`: notificacoes por usuario.
- `audit_logs`: evento, entidade, estado anterior/novo, IP e data.

## Regras

1. Email e matricula sao unicos em `users`.
2. Perfil e lotacao sao relacionamentos, nunca texto confiado do cliente.
3. Processo referencia criador/responsavel e unidade organizacional.
4. As fases aceitas sao exatamente `Planejar`, `Analisar`, `Desenhar`, `Implementar` e `Monitorar`.
5. Atividade so pode ser concluida quando seus itens obrigatorios estiverem concluidos; a regra deve ser reforcada no service transacional.
6. Progresso fica entre 0 e 100.
7. Anexo referencia processo e opcionalmente atividade; arquivo fisico permanece em storage privado.
8. Auditoria nao deve ser editada ou excluida por usuario comum.
9. Migrations sao aplicadas em ordem e registradas em `schema_migrations`.
10. O schema legado em portugues permanece durante a transicao para evitar alteracao do ciclo BPM existente.

## Migration

A migration de fundacao e `database/migrations/0006_sprint1_foundation.sql`. Ela cria as tabelas canonicas, indices, roles/permissoes iniciais sem credenciais e restricoes de auditoria. A execucao depende de PostgreSQL acessivel e deve ser feita por `npm run migrate`.
