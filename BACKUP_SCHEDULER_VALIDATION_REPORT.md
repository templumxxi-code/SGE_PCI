# BACKUP SCHEDULER VALIDATION REPORT

Data: 2026-09-02

## Problema inicial

A tarefa `SGE PCI - Backup Diário`, executada como `SYSTEM`, falhava com `Variavel obrigatoria ausente: DATABASE_HOST` porque o usuário SYSTEM não carrega o `.env` do projeto.

## Auditoria realizada

- Script: `scripts/backup-database.ps1`, existente.
- `.env`: contém variáveis `DB_*` e `DATABASE_*`; valores sensíveis não foram exibidos.
- `scripts/backup.env`: criado com `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` e `DATABASE_PASSWORD` vazio.
- Senha fixa no script PowerShell: não encontrada.
- Permissões de `scripts`: SYSTEM, Administradores e usuário local com FullControl herdado.
- Tarefa: `SGE PCI - Backup Diário`, `SYSTEM`, `ServiceAccount`, `Highest`, diária às `02:00`.
- Último resultado auditado anteriormente: `LastTaskResult=1`.

## Causa raiz

O processo SYSTEM não herda o ambiente carregado pelo usuário e o script não carregava um arquivo próprio de configuração.

## Correção aplicada

- `scripts/backup-database.ps1`: calcula o próprio diretório com `MyInvocation.MyCommand.Path`, localiza `backup.env`, ignora comentários/linhas vazias, carrega somente variáveis permitidas no processo atual e não persiste variáveis no Windows.
- `scripts/backup.env`: template criado sem senha. O administrador deve preencher `DATABASE_PASSWORD` localmente.
- `.gitignore`: `scripts/backup.env` adicionado para impedir versionamento acidental.

## Evidências

Validação de sintaxe: `SCRIPT_PARSE_OK`.

Execução sem parâmetros a partir do contexto do projeto:

- `BACKUP_WITHOUT_SECRET_EXIT=1`.
- Motivo: `Configure PGPASSWORD via secret manager ou PGPASSFILE`.
- Isso comprova que o arquivo foi carregado e as variáveis de conexão foram reconhecidas; a execução foi bloqueada corretamente pela senha vazia.
- Não foi exibida ou gravada nenhuma senha.

A execução anterior com diretório explícito e credencial em memória produziu `backup_success` e arquivo de `155793` bytes. Essa execução não comprova a nova tarefa SYSTEM.

## Task Scheduler

A tarefa existente não foi alterada nem executada novamente, pois `backup.env` ainda não contém senha e a execução falharia de forma esperada.

Não é possível marcar `LastTaskResult=0` ou confirmar novo arquivo automático sem que o administrador preencha a senha localmente em `scripts/backup.env` e execute a tarefa.

## Status final

# FAIL

Bloqueio restante:

1. Preencher `DATABASE_PASSWORD` em `scripts/backup.env` diretamente no computador, sem enviar ao chat.
2. Garantir ACL restritiva para o arquivo, permitindo somente SYSTEM, Administradores e a conta necessária.
3. Executar `Start-ScheduledTask -TaskName "SGE PCI - Backup Diário"` em PowerShell elevado.
4. Confirmar `Get-ScheduledTaskInfo -TaskName "SGE PCI - Backup Diário"` com `LastTaskResult=0`.
5. Confirmar novo `storage/backups/sge_pci_*.sql` e `backup_success`.

A rotina foi corrigida, mas o GO não pode ser declarado sem execução real da tarefa com sucesso.
