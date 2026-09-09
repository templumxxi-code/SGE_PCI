# Migration Inventory - Sprint 0

Data: 24/08/2026  
Projeto: SGE PCI/RN

Este inventario registra o que deve sair do frontend/localStorage e do mock em memoria antes do backend definitivo. Nenhum dado foi apagado nesta Sprint 0.

## Entidades para PostgreSQL

| Origem atual | Destino | Criticidade | Observacao |
|---|---|---:|---|
| `sge_pci_local_users` / `storage/users.json` / `src/mockData.js:users` | `usuarios` | CRITICA | Migrar somente hashes; remover senha em claro e credenciais demonstrativas. |
| `sge_pci_processos` / `src/mockData.js:processos` | `processos` | CRITICA | Preservar status, fase, escopo organizacional, responsavel e soft delete. |
| atividades em processos e mock | `subprocessos`, `atividades` | CRITICA | Manter ordem, fase, responsavel, prazos e status. |
| checklists dentro de atividades | `checklist_itens` ou tabela equivalente | CRITICA | Persistir item, obrigatoriedade, concluido, autor e timestamps. |
| `sge_pci_org_structure` | `organizational_units` | CRITICA | Preservar hierarquia, tipo, sigla, ativo e vinculos de lotacao. |
| equipe/participantes de Planejar | `processo_equipe` | ALTA | Vincular usuario, papel, atividade autorizada e periodo. |
| SWOT | `planejar_swot` | MEDIA | Vincular ao processo e registrar autoria/alteracao. |
| cronograma | `planejar_cronograma` | ALTA | Persistir marcos, prazos, responsaveis e status. |
| plano de projeto | `planejar_planos_projeto` | ALTA | Versionar drafts e submissoes. |
| indicadores em `sge_pci_indicators` / mock | `indicadores` | ALTA | Vincular processo, meta, valor, periodicidade e historico. |
| `sge_pci_notifications` | `notificacoes` | MEDIA | Persistir destinatario, origem, tipo, lido e data. |
| `sge_pci_approval_history` e status do processo | `aprovacoes` / `historico_aprovacoes` | CRITICA | Append-only, com papel, decisao, justificativa e timestamp. |
| `logs` do mock e backend | `logs_auditoria` | CRITICA | Append-only, usuario, acao, entidade, antes/depois, IP e user-agent redigidos. |
| `setores` e macroprocessos do mock | `setores`, `macroprocessos` | ALTA | Seed institucional revisado e idempotente. |

## Arquivos fisicos e metadata

| Origem atual | Destino | Regra |
|---|---|---|
| `storage/attachments/` | storage privado dedicado ou objeto S3/R2 equivalente | Nunca servir diretamente de `public`; nome fisico UUID; ACL por processo/atividade. |
| metadata de anexos em atividades/mock | PostgreSQL `anexos` | MIME, extensao, tamanho, SHA-256, autor, processo, atividade, exclusao logica. |
| PDFs em `public/tmp/` e `test/tmp/` | area temporaria fora do web root | TTL/limpeza automatica; nao incluir dados institucionais em artefatos versionados. |

## Estado que pode permanecer no navegador

Somente estado nao sensivel e reconstruivel pode permanecer em localStorage, por exemplo:

- `sge_pci_theme`;
- selecao temporaria de indicador/atividade;
- versao de migracao de UI;
- preferencias de filtros sem dados pessoais.

O JWT, a sessao do usuario, usuarios, processos, indicadores, notificacoes, aprovacoes e estrutura organizacional nao devem ser fonte de verdade no navegador. A estrategia final de token/sessao deve ser definida na Sprint 2 considerando cookie HttpOnly/SameSite ou alternativa equivalente.

## Seeds e dados demonstrativos

- Separar seeds de teste (`pg-mem`/integracao) de dados de desenvolvimento.
- Marcar qualquer dado demonstrativo como fixture explicita.
- Nao transportar credenciais demonstrativas ou qualquer senha para ambientes institucionais.
- Validar setores, unidades e referencias antes de carregar processos.

## Ordem recomendada de migracao

1. Modelo de usuarios, perfis e unidades organizacionais.
2. Processos, fases, atividades e checklists.
3. Equipe, responsabilidades, indicadores e Planejar.
4. Anexos metadata e storage privado.
5. Aprovacoes, notificacoes e auditoria append-only.
6. Rotina de importacao idempotente, reconciliacao e backup.

## Regras de integridade obrigatorias

- FKs para processo, atividade, usuario e unidade.
- Restricoes de perfil e escopo aplicadas no backend, nunca apenas no frontend.
- Unicidade para email, matricula, siglas e chaves funcionais de atividades fixas.
- Transacao para operacoes que alterem processo, checklist, anexo e log.
- Soft delete preservando auditoria.
- Hash de senha com algoritmo aprovado e custo definido pela Sprint 3.
- Backup e teste de restauracao planejados para Sprint 7.
