# SPRINT FINAL DBA - APROVACAO DE PRODUCAO

Data: 2026-09-02

## Fase 1 - Acesso PostgreSQL

Consultas executadas no PostgreSQL real:

```sql
SELECT current_user;

SELECT rolsuper, rolcreatedb
FROM pg_roles
WHERE rolname=current_user;
```

Resultado:

- Usuario: `sge_app`
- `rolsuper`: `false`
- `rolcreatedb`: `false`
- `rolcanlogin`: `true` (validado anteriormente)

Conclusao: FAIL para requisito de usuario administrador. O usuario da aplicacao nao possui privilegio administrativo.

## Fase 2 - Banco temporario

Banco solicitado: `sge_pci_restore_validation`.

Consulta real confirmou que o banco nao existe. A tentativa de criacao retornou:

- `permissao negada ao criar banco de dados`
- exit code `1`

Conclusao: FAIL.

## Fase 3 - Restore

Arquivo de backup disponivel:

- `backup_pre_producao.sql`
- tamanho: `155793` bytes

Restore real: **NAO EXECUTADO**, porque nao foi possivel criar o banco temporario. Nao houve simulacao.

Conclusao: FAIL.

## Fase 4 - Comparacao

Contagens do banco original `sge_pci`:

| Tabela | Original |
|---|---:|
| `processes` | 4 |
| `process_phases` | 4 |
| `process_activities` | 2 |
| `users` | 2 |

Contagens restauradas: indisponiveis, pois a base restaurada nao existe.

Resultado `ORIGINAL = RESTAURADO`: nao comprovado.

## Fase 5 - Aplicacao no banco restaurado

Nao executada. A aplicacao permaneceu apontada para `sge_pci`; nao houve alteracao de ambiente para uma base inexistente.

Health do banco original no momento da validacao:

```json
{"status":"ok","database":"connected"}
```

Login, criacao de processo, fase, atividade e dashboard no banco restaurado: nao executados.

## Backup automatico

O script `scripts/backup-database.ps1` existe, exige secrets externos, valida exit code/tamanho e implementa retencao de 30 dias.

Porem, a verificacao do Windows Task Scheduler nao encontrou tarefa do SGE PCI/RN para esse script. Foram encontradas somente tarefas nativas do Windows.

- Rotina criada: PASS
- Agendamento operacional comprovado: FAIL

## Evidencias anteriores do fluxo no banco original

O fluxo BPM no banco original foi validado anteriormente:

- processo criado por API: `223fbf39-62fa-4395-9890-23c3d6319842`
- fase criada por API: `68fb7e1f-ece7-4abe-9776-c7ee61e23ac3`
- atividade criada por API: `c74bcf22-c344-47cb-be9f-7d53b613020b`
- update: HTTP `200`
- dashboard: HTTP `200`
- persistencia apos restart: comprovada

Essas evidencias sao do banco original e nao substituem o teste contra a base restaurada.

## Quadro final

| Item | Resultado |
|---|---|
| PostgreSQL real | PASS |
| Usuario administrador | FAIL |
| Banco temporario criado | FAIL |
| Restore real | FAIL |
| Comparacao original/restaurado | FAIL / NAO EXECUTADA |
| Aplicacao no banco restaurado | FAIL / NAO EXECUTADA |
| Login no banco restaurado | FAIL / NAO EXECUTADO |
| Criacao BPM no banco restaurado | FAIL / NAO EXECUTADA |
| Dashboard no banco restaurado | FAIL / NAO EXECUTADO |
| Backup real | PASS |
| Backup automatico agendado | FAIL |
| CORS | PASS, wildcard rejeitado |
| JWT | PASS parcial, secret de producao nao fornecido |
| RBAC | FAIL parcial, 2 falhas no teste de seguranca |
| Health original | PASS, HTTP 200 |

## Decisao final

# NO-GO PRODUCAO

O restore real nao foi comprovado, portanto a aprovacao esta proibida pelo criterio da Sprint.

Bloqueadores objetivos:

1. `sge_app` nao e administrador e possui `rolcreatedb=false`.
2. `sge_pci_restore_validation` nao foi criado.
3. `backup_pre_producao.sql` nao foi restaurado em banco separado.
4. Nao foi possivel comparar contagens e objetos original versus restaurado.
5. A aplicacao nao foi validada contra a base restaurada.
6. Nao existe agendamento operacional do backup no Task Scheduler.
7. O teste de seguranca possui 2 falhas ainda nao resolvidas.

Nenhum codigo da aplicacao, schema ou dado do banco original foi alterado nesta Sprint.

## Acao administrativa necessaria

Um DBA deve criar o banco temporario em ambiente isolado e executar o restore com credencial administrativa autorizada. Depois devem ser repetidas as consultas de contagem, objetos e o fluxo da aplicacao contra a base restaurada. A senha administrativa nao deve ser enviada ao chat nem registrada neste arquivo.
