# BACKUP POLICY

## Escopo

Backup diario do banco PostgreSQL usado pelo SGE PCI/RN, com retencao de 30 dias.

## Rotina

Script: `scripts/backup-database.ps1`

O script:

- gera nome com data/hora: `sge_pci_yyyyMMdd_HHmmss.sql`;
- usa `pg_dump` oficial;
- exige `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME` e `DATABASE_USER`;
- exige senha fornecida externamente por `PGPASSWORD` temporario ou `PGPASSFILE` protegido;
- nunca grava senha no script ou no log;
- valida exit code do `pg_dump`;
- valida arquivo maior que zero;
- registra inicio, sucesso/falha, nome, tamanho e retencao em `storage/backups/backup.log`;
- remove arquivos SQL com mais de 30 dias.

## Agendamento Windows

Configurar uma tarefa no Task Scheduler para executar diariamente, fora do horario de pico:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\caminho\SMP PCI\scripts\backup-database.ps1
```

A credencial deve ser fornecida pelo mecanismo seguro de secrets da infraestrutura. Nao colocar senha em `.ps1`, `.env` versionado, linha de comando persistente ou log.

## Validacao

Um backup so e considerado valido quando:

1. o processo termina com exit code `0`;
2. o arquivo existe e tem tamanho maior que zero;
3. o log registra `backup_success`;
4. o arquivo e restaurado periodicamente em banco separado;
5. consultas de contagem e objetos sao comparadas com a origem.

## Estado atual

- Backup manual real existente: `backup_pre_producao.sql`, 155793 bytes.
- Rotina automatica criada: script presente, mas agendamento operacional ainda nao comprovado.
- Restore real: ainda bloqueado por falta de banco separado e privilegio administrativo.
