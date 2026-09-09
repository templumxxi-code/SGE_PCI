# RESTORE VALIDATION REPORT

Data: 2026-09-02

## Ambiente original

- PostgreSQL: 18.6
- Banco: `sge_pci`
- Schema: `public`
- Usuario da aplicacao: `sge_app`
- Contagens conhecidas: `processes=4`, `process_phases=4`, `process_activities=2`

## Fase 1

Consulta executada:

```sql
SELECT current_user;
SELECT rolcreatedb FROM pg_roles WHERE rolname=current_user;
SELECT datname FROM pg_database WHERE datname='sge_pci_restore_validation';
```

Resultado:

- `current_user=sge_app`
- `rolcreatedb=false`
- `sge_pci_restore_validation` nao existe

## Fase 2

Tentativa:

```sql
CREATE DATABASE sge_pci_restore_validation;
```

Resultado: FAIL, `permissao negada ao criar banco de dados`, exit code `1`.

## Fases 3 a 6

Nao executadas porque o banco de restauracao nao foi criado:

- restore de `backup_pre_producao.sql`: nao executado;
- contagens restauradas: nao disponiveis;
- tabelas, indices, constraints, triggers e functions: nao validados;
- aplicacao contra banco restaurado: nao executada.

## Decisao

# NO-GO

Nao existe evidencia de restore real. O bloqueio requer usuario administrador PostgreSQL autorizado para criar um banco separado ou que o administrador crie esse banco isolado e execute o restore.
