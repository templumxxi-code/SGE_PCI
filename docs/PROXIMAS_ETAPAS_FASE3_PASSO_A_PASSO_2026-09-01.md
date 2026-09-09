# 🚀 PRÓXIMAS ETAPAS - PASSO A PASSO PRÁTICO
## SGE PCI/RN - Como Implementar Fase 2+ da Auditoria

**Data**: 2026-09-01  
**Objetivo**: Guia prático para resolver CRÍTICOS e ALTOS  
**Público**: DevOps, Backend, QA

---

## ⏱️ TIMELINE RESUMIDA

```
HOJE:          Gerar credenciais + preparar sprint
AMANHÃ:        Implementar + testar backup
QUARTA:        Implementar ALTOS
QUINTA:        Validação full + GO/NO-GO
SEXTA:         Deploy em produção (se GO)
```

---

## 🎯 FASE 3 - SEGREDOS E AMBIENTE (2-3 horas)

### Tarefa 3.1: Gerar JWT_SECRET Seguro

**Tempo**: 5 minutos  
**Responsável**: DevOps / Backend Lead

**Passo 1 - Gerar string aleatória**:
```powershell
# PowerShell
$random = [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
Write-Host "JWT_SECRET=$random"

# Resultado esperado: base64 string de 44 chars
# Exemplo: a3f7b2c1e9d4f6a8b2c5e1f9a3b6d8c2xYzUvWqPr==
```

**Passo 2 - Validar formato**:
```bash
# Deve ter 32+ caracteres
# Deve ser aleatório (nada como "senha", "admin", "secret")
# Deve conter caracteres especiais/números
```

**Passo 3 - Armazenar seguro**:
```bash
# NÃO comitar para Git
# NÃO compartilhar por email
# Armazenar em:
# - Variável de ambiente
# - Secret manager (AWS Secrets Manager, Vault, etc)
# - .env.production (protegido)
```

**Passo 4 - Testar**:
```bash
cd "c:\Users\Luiz Mateus\Desktop\BKP NGE\SMP PCI"
# Editar .env
# JWT_SECRET=<novo_valor>
# npm start
# Fazer login - deve funcionar
```

**Validação**:
- [ ] String gerada aleatoriamente
- [ ] Login funciona com novo secret
- [ ] Tokens antigos inválidos (esperado)
- [ ] Logout automático de sessões existentes

---

### Tarefa 3.2: Gerar DATABASE_PASSWORD Seguro

**Tempo**: 5 minutos  
**Responsável**: DevOps / DBA

**Passo 1 - Gerar senha segura**:
```bash
# PowerShell
$password = [System.Web.Security.Membership]::GeneratePassword(16, 3)
Write-Host "DATABASE_PASSWORD=$password"

# Resultado esperado: string com 16 chars + especiais
# Exemplo: aB3$dEfGhIjKlMnO
```

**Passo 2 - Validar requisitos**:
```
✓ Mínimo 16 caracteres
✓ Incluir maiúsculas (A-Z)
✓ Incluir minúsculas (a-z)
✓ Incluir números (0-9)
✓ Incluir especiais (!@#$%^&*)
✗ Sem espaços
✗ Sem acentos (á, é, í, ó, ú)
```

**Passo 3 - Alternar senha no PostgreSQL**:
```sql
-- Connect as postgres admin first
-- psql -U postgres

ALTER USER postgres WITH PASSWORD 'nova_senha_aqui';
ALTER USER smp_pci WITH PASSWORD 'nova_senha_aqui';
```

**Passo 4 - Atualizar .env**:
```bash
# .env ou .env.production
DATABASE_PASSWORD=nova_senha_aqui
```

**Passo 5 - Testar conexão**:
```bash
# Deve conectar com sucesso
npm start
# Checar logs - deve estar conectado ao BD
```

**Validação**:
- [ ] Senha alterada no PostgreSQL
- [ ] .env atualizado
- [ ] Aplicação conecta ao BD
- [ ] Queries funcionam normalmente
- [ ] Nenhuma pessoa tem a senha (documentar)

---

### Tarefa 3.3: Validar .env.production

**Tempo**: 10 minutos  
**Responsável**: DevOps

**Passo 1 - Criar arquivo .env.production**:
```bash
# .env.production (NUNCA comitar!)
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://smp_pci:PASSWORD@localhost:5432/smp_pci
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=smp_pci
DATABASE_PASSWORD=<sua_senha_nova>
DATABASE_NAME=smp_pci
JWT_SECRET=<seu_jwt_secret_novo>
JWT_EXPIRATION=24h
CORS_ORIGINS=https://seu-dominio.com
LOG_LEVEL=info
NODE_MAILER_SERVICE=gmail
NODE_MAILER_USER=seu-email@gmail.com
NODE_MAILER_PASSWORD=sua-senha-app
ADMIN_EMAIL=admin@seu-dominio.com
```

**Passo 2 - Validar que não tem padrões**:
```bash
# Procurar por:
grep -E "(password|secret|key)=(admin|test|123|default)" .env.production
# Resultado: DEVE estar vazio (nenhuma padrão encontrada)
```

**Passo 3 - Proteger arquivo**:
```bash
# Linux/Mac
chmod 600 .env.production
ls -la .env.production  # deve ter -rw------- (600)

# PowerShell (Windows)
icacls "C:\path\.env.production" /inheritance:r /grant:r "$env:USERNAME:F"
```

**Passo 4 - Validar .gitignore**:
```bash
# .gitignore DEVE conter:
# .env
# .env.production
# .env.local
# !.env.example

# Validar:
git check-ignore .env.production  # deve retornar ".env.production"
```

**Validação**:
- [ ] .env.production criado
- [ ] Sem valores padrão/fraco
- [ ] Protegido em filesystem
- [ ] No .gitignore
- [ ] .env.example seguro

---

## 🎯 FASE 4 - BACKUP E RECUPERAÇÃO (3-4 horas)

### Tarefa 4.1: Criar Script de Backup

**Tempo**: 30 minutos  
**Responsável**: DevOps / DBA

**Passo 1 - Criar arquivo de script**:
```bash
# scripts/backup-postgresql.sh (Linux/Mac)
#!/bin/bash

# Configuração
DB_USER="smp_pci"
DB_NAME="smp_pci"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="./storage/backups"
RETENTION_DAYS=30

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

# Criar backup
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/smp_pci_$DATE.sql"

pg_dump \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d $DB_NAME \
  > $BACKUP_FILE

# Comprimir
gzip $BACKUP_FILE

# Remover backups antigos (>30 dias)
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup concluído: $(ls -lh ${BACKUP_FILE}.gz | awk '{print $5, $9}')"
```

**Passo 2 - Versão PowerShell (Windows)**:
```powershell
# scripts/backup-postgresql.ps1 (Windows)
param(
    $DbUser = "smp_pci",
    $DbName = "smp_pci",
    $DbHost = "localhost",
    $BackupDir = ".\storage\backups"
)

# Criar diretório
if (!(Test-Path $BackupDir)) { New-Item -ItemType Directory $BackupDir | Out-Null }

# Criar backup
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\smp_pci_$Date.sql"

& "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" `
  -h $DbHost `
  -U $DbUser `
  -d $DbName `
  > $BackupFile

# Comprimir
if (Get-Command 7z -ErrorAction SilentlyContinue) {
    & 7z a -tgzip "$BackupFile.gz" $BackupFile
    Remove-Item $BackupFile
} else {
    # Sem 7z, apenas avisar
    Write-Host "⚠️  7-Zip não encontrado, backup descomprimido: $BackupFile"
}

# Remover backups antigos (>30 dias)
Get-ChildItem "$BackupDir\*.sql.gz" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item

Write-Host "✅ Backup concluído: $(Get-Item $BackupFile | Select-Object -ExpandProperty FullName)"
```

**Passo 3 - Testar script**:
```bash
# Linux/Mac
bash scripts/backup-postgresql.sh
# Esperado: ✅ Backup concluído: ...

# PowerShell (Windows)
.\scripts\backup-postgresql.ps1
# Esperado: ✅ Backup concluído: ...

# Validar que arquivo foi criado
ls -la storage/backups/
```

**Validação**:
- [ ] Script executa sem erros
- [ ] Arquivo .sql.gz criado
- [ ] Tamanho > 0 bytes
- [ ] Perda de espaço razoável (< 10MB)

---

### Tarefa 4.2: Testar Restauração

**Tempo**: 30 minutos  
**Responsável**: QA / DevOps

**AVISO**: Restauração destróis banco atual! Fazer em ambiente de teste.

**Passo 1 - Criar banco de teste**:
```sql
-- Como postgres admin
CREATE DATABASE smp_pci_restore_test;
```

**Passo 2 - Restaurar backup**:
```bash
# Linux/Mac
gunzip -c storage/backups/smp_pci_20260901_120000.sql.gz | \
  psql -h localhost -U smp_pci -d smp_pci_restore_test

# PowerShell (Windows)
$backupFile = "storage/backups/smp_pci_20260901_120000.sql.gz"
7z x -so $backupFile | & "C:\Program Files\PostgreSQL\15\bin\psql.exe" `
  -h localhost `
  -U smp_pci `
  -d smp_pci_restore_test
```

**Passo 3 - Validar restauração**:
```sql
-- Conectar ao banco restaurado
\c smp_pci_restore_test

-- Validar que tabelas existem
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Validar que dados existem
SELECT COUNT(*) FROM usuarios;
SELECT COUNT(*) FROM processos;
SELECT COUNT(*) FROM indicadores;

-- Comparar com banco original
-- Números devem ser iguais
```

**Passo 4 - Limpar teste**:
```sql
DROP DATABASE smp_pci_restore_test;
```

**Validação**:
- [ ] Backup restaura sem erros
- [ ] Tabelas criadas com sucesso
- [ ] Dados restaurados (COUNT > 0)
- [ ] Schema idêntico ao original

---

### Tarefa 4.3: Configurar Backup Automático

**Tempo**: 30 minutos  
**Responsável**: DevOps / Sysadmin

**Linux - Usando cron**:
```bash
# Editar crontab
crontab -e

# Adicionar linha para backup diário às 2 da manhã
0 2 * * * /path/to/scripts/backup-postgresql.sh >> /var/log/backup-smp-pci.log 2>&1
```

**Windows - Usando Task Scheduler**:
```powershell
# PowerShell com permissão de admin

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -File C:\caminho\backup-postgresql.ps1"

$trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask -TaskName "SMP-PCI-Backup" `
  -Action $action `
  -Trigger $trigger `
  -RunLevel Highest `
  -Description "Backup diário do banco SMP-PCI"

# Validar
Get-ScheduledTask -TaskName "SMP-PCI-Backup"
```

**Validação**:
- [ ] Task criada com sucesso
- [ ] Executa na hora agendada
- [ ] Logs aparecem em local definido
- [ ] Backup diário confirmado

---

## 🎯 FASE 5 - CONFIGURAÇÃO CORS (1 hora)

### Tarefa 5.1: Definir Domínio de Produção

**Tempo**: 20 minutos  
**Responsável**: Backend / Infra

**Passo 1 - Identifique o domínio**:
```
Exemplo: https://smp.pci.rn.gov.br
Ou: https://seu-servidor.cloud.com
```

**Passo 2 - Atualizar .env.production**:
```bash
# .env.production
CORS_ORIGINS=https://smp.pci.rn.gov.br

# Ou múltiplos (se tiver staging):
CORS_ORIGINS=https://smp.pci.rn.gov.br,https://staging-smp.pci.rn.gov.br,https://admin-smp.pci.rn.gov.br
```

**Passo 3 - Validar código**:
```javascript
// src/server.js linha ~50
const parseCorsOrigins = () => {
    const defaultOrigins = process.env.NODE_ENV === 'production'
        ? ''  // ← Vazio bloqueia, será substituído por env var
        : '...';
    const configured = process.env.CORS_ORIGINS || defaultOrigins;
    return configured.split(',').map((value) => value.trim()).filter(Boolean);
};

// Log para validar
console.log(`CORS Origins: ${parseCorsOrigins()}`);
```

**Validação**:
- [ ] Domínio definido em variável
- [ ] Sem wildcard "*" em produção
- [ ] Teste que frontend comunica com API

---

### Tarefa 5.2: Testar CORS em Produção

**Tempo**: 20 minutos  
**Responsável**: QA / Frontend

**Passo 1 - Testar com curl/Postman**:
```bash
curl -X GET https://api.seu-dominio.com/api/health \
  -H "Origin: https://smp.pci.rn.gov.br"

# Deve incluir headers:
# Access-Control-Allow-Origin: https://smp.pci.rn.gov.br
# Access-Control-Allow-Credentials: true
```

**Passo 2 - Testar com browser**:
```javascript
// Console do navegador em https://smp.pci.rn.gov.br
fetch('https://api.seu-dominio.com/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ CORS OK', d))
  .catch(e => console.error('❌ CORS Erro', e.message));
```

**Passo 3 - Testar origin inválida**:
```bash
# Deve ser bloqueado
curl -X GET https://api.seu-dominio.com/api/health \
  -H "Origin: https://attacker.com"

# Não deve retornar CORS headers
```

**Validação**:
- [ ] Origin válida: CORS headers presentes
- [ ] Origin inválida: CORS headers ausentes
- [ ] Preflight OPTIONS: responde 200

---

## ✅ VALIDAÇÃO FINAL DE FASE 3

### Checklist Completo

```
FASE 3: SEGREDOS E AMBIENTE
├─ JWT_SECRET
│  ├─ [x] Gerado aleatoriamente
│  ├─ [x] 32+ caracteres
│  ├─ [x] Armazenado seguro
│  └─ [x] Login funciona
│
├─ DATABASE_PASSWORD
│  ├─ [x] Gerado aleatoriamente
│  ├─ [x] 16+ caracteres
│  ├─ [x] Alterado no PostgreSQL
│  └─ [x] Conexão funciona
│
├─ .env.production
│  ├─ [x] Criado com valores seguros
│  ├─ [x] Sem defaults fraco
│  ├─ [x] Protegido em filesystem
│  └─ [x] No .gitignore
│
├─ BACKUP
│  ├─ [x] Script criado
│  ├─ [x] Executa com sucesso
│  ├─ [x] Restauração testada
│  └─ [x] Agendado diariamente
│
└─ CORS
   ├─ [x] Domínio definido
   ├─ [x] CORS_ORIGINS configurado
   ├─ [x] Frontend comunica
   └─ [x] Origins inválidas bloqueadas
```

---

## 🎯 PRÓXIMA FASE

**Após completar Fase 3**: Prosseguir para **FASE 4+ (Autenticação Testing)**

Com Fases 3-4 completas, você terá:
- ✅ 0 vulnerabilidades de dependências
- ✅ Credenciais fortes
- ✅ Backup operacional
- ✅ CORS produção funcional

**GO para produção**: Ainda faltam Fases 5-18, mas os CRÍTICOS estarão resolvidos.

---

**Guia Prático**: Fase 3 - Segredos e Ambiente  
**Tempo Total**: 2-3 horas  
**Resultado Esperado**: Sistema pronto para produção (credenciais seguras)
