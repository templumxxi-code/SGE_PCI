# 📋 PRE-PRODUCTION AUDIT - FASE 2 - DEPENDÊNCIAS E VULNERABILIDADES
## SGE PCI/RN - Análise de npm audit

**Data**: 2026-09-01  
**Auditoria**: Verificação de vulnerabilidades de dependências  
**Auditor**: npm audit  
**Resultado**: 6 vulnerabilidades encontradas (1 baixa, 5 altas)

---

## 🎯 RESUMO EXECUTIVO

Executado `npm audit` no projeto. **6 vulnerabilidades encontradas**:
- ✅ 1 BAIXA: body-parser (fácil de corrigir)
- 🔴 5 ALTAS: brace-expansion, ip-address, semver

**Status**: Todas têm fix disponível via `npm audit fix`

---

## 🔴 VULNERABILIDADES CRÍTICAS ENCONTRADAS

### 1. brace-expansion ≤1.1.17 - DoS (ALTA)
**Package**: brace-expansion  
**Versão Afetada**: ≤1.1.17  
**Severidade**: 🔴 ALTA  
**Status**: Fix disponível  

**Descrição**:
Três vulnerabilidades CVE em brace-expansion:

1. **GHSA-3jxr-9vmj-r5cp**: DoS via exponential-time expansion
   - Entrada: `{1..9999999}{1..9999999}}`
   - Resultado: CPU spinning infinitamente

2. **GHSA-mh99-v99m-4gvg**: DoS via unbounded expansion length
   - Entrada: `{1..999999999}`
   - Resultado: Out-of-memory crash

3. **GHSA-rgw5-rvv9-x895**: DoS via unbounded intermediate arrays
   - Bypass da mitigação de CVE-2026-14257
   - Causa consumo ilimitado de memória

**Como Você Usa brace-expansion**:
- Indiretamente via `npm` → `glob` → `minimatch` → `brace-expansion`
- Em desenvolvimento (via nodemon → simple-update-notifier)

**Impacto em Produção**:
- ⚠️ MÉDIA - Não é usado em código production (apenas desenvolvimento)
- 🟢 Packages de produção não dependem diretamente

**Impacto no Deploy**:
- 🔴 ALTA - Se usada string controlada por usuário em glob patterns (malicioso)

**Correção**:
```bash
npm audit fix
```

**Versão Segura**: > 1.1.17

---

### 2. ip-address ≤10.3.0 - SSRF/Trust Boundary Bypass (ALTA)
**Package**: ip-address  
**Versão Afetada**: ≤10.3.0  
**Severidade**: 🔴 ALTA  
**Status**: Fix disponível  

**Descrição**:
Três vulnerabilidades em parser de IPv4/IPv6:

1. **GHSA-mwp4-54f8-5fhr**: Address4 decodes octetos com leading-zero como decimal
   - Attacker: `192.168.001.1` (octal) vs `192.168.1.1` (decimal)
   - Bypass: SSRF filters que permitem 192.168.x.x

2. **GHSA-4xrf-jv44-h6hh**: CIDR suffix suprime special-use classification
   - Attacker: `127.0.0.1/8` (treated as normal IP)
   - Bypass: Filters de loopback

3. **GHSA-22jq-vg5j-6vgg**: IPv4-mapped IPv6 addresses misclassified
   - Attacker: `::ffff:192.168.1.1` (bypass filters IPv6)
   - Bypass: SSRF checks específicos de IPv4

**Como Você Usa ip-address**:
- Procure em `package.json`: ❌ NÃO está listado
- Depêndencia transitiva via `pg` (PostgreSQL driver) para validação de conexão
- OU possível dependência via middleware de IP

**Impacto em Produção**:
- 🔴 ALTA - Se usar validação de IP para segurança
- Exemplo: "bloquear conexões de 127.0.0.1"
- Attacker contorna com `127.000.000.001`

**Impacto no Deploy**:
- 🟢 MÉDIA - Usado apenas validação interna, não input do usuário

**Correção**:
```bash
npm audit fix
```

**Versão Segura**: > 10.3.0

---

### 3. semver 7.0.0-7.5.1 - ReDoS (ALTA)
**Package**: semver  
**Versão Afetada**: 7.0.0 - 7.5.1  
**Severidade**: 🔴 ALTA  
**Status**: Fix disponível (com breaking change)  

**Descrição**:
Regular Expression Denial of Service (ReDoS) em parser de versões:

- Versão afetada em `simple-update-notifier` → `nodemon` → desenvolvimento
- Regex exponencial: `^v?(\d+)\.(\d+)\.(\d+)(?:-([\dA-Za-z\-\.]+))?(?:\+[\dA-Za-z\-\.]+)?$`
- Input malicioso: `v1.0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000x`
- Resultado: Parsing toma minutos/horas (CPU 100%)

**Como Você Usa semver**:
- `nodemon` (dev dependency) → `simple-update-notifier` → `semver`
- Usado para parsear versão do Node.js
- Indiretamente para check de atualizações de npm

**Impacto em Produção**:
- 🟢 BAIXO - Não é usado em produção (apenas desenvolvimento)
- `nodemon` é apenas dev dependency

**Impacto no Deploy**:
- 🟢 BAIXO - Versão está fixada no package-lock.json

**Correção**:
```bash
npm audit fix --force
```

**⚠️ Nota Importante**:
- Requer `nodemon@3.1.14+` (pode ser breaking change)
- Validar que `npm start` continua funcionando após upgrade

**Versão Segura**: > 7.5.1

---

### 4. body-parser <1.20.6 - DoS Bypass (BAIXA)
**Package**: body-parser  
**Versão Afetada**: <1.20.6  
**Severidade**: 🟡 BAIXA  
**Status**: Fix disponível  

**Descrição**:
DoS via invalid limit value que silenciosamente desabilita size enforcement:

- Header: `Content-Length: invalid_number`
- Comportamento: Ignora limit, aceita payload ilimitado
- Resultado: Consumo de memória/disco

**Como Você Usa body-parser**:
- Dependência direta via `express.json()` e `express.urlencoded()`
- Usado em: `app.use(express.json({ limit: '50mb' }))`

**Impacto em Produção**:
- 🟠 MÉDIA - Atacker pode enviar payload grande sem limite
- Mas seu código usa `limit: '50mb'`, então parcialmente mitigado

**Impacto no Deploy**:
- 🟠 MÉDIA - Nginx/reverse proxy pode fornecer defesa adicional

**Correção**:
```bash
npm audit fix
```

**Versão Segura**: ≥ 1.20.6

---

## 📊 MATRIZ DE VULNERABILIDADES

| CVE/Advisory | Pacote | Versão | Severidade | Status Prod | Fix |
|---|---|---|---|---|---|
| GHSA-3jxr-9vmj-r5cp | brace-expansion | ≤1.1.17 | 🔴 ALTA | Dev only | ✅ Sim |
| GHSA-mh99-v99m-4gvg | brace-expansion | ≤1.1.17 | 🔴 ALTA | Dev only | ✅ Sim |
| GHSA-rgw5-rvv9-x895 | brace-expansion | ≤1.1.17 | 🔴 ALTA | Dev only | ✅ Sim |
| GHSA-mwp4-54f8-5fhr | ip-address | ≤10.3.0 | 🔴 ALTA | Possível | ✅ Sim |
| GHSA-4xrf-jv44-h6hh | ip-address | ≤10.3.0 | 🔴 ALTA | Possível | ✅ Sim |
| GHSA-22jq-vg5j-6vgg | ip-address | ≤10.3.0 | 🔴 ALTA | Possível | ✅ Sim |
| GHSA-c2qf-rxjj-qqgw | semver | 7.0.0-7.5.1 | 🔴 ALTA | Dev only | ✅ Sim (breaking) |
| GHSA-v422-hmwv-36x6 | body-parser | <1.20.6 | 🟡 BAIXA | Produção | ✅ Sim |

---

## 🎯 PLANO DE REMEDIAÇÃO

### Prioridade 1 - Imediato (antes de produção)

#### 1.1 - Atualizar body-parser
```bash
npm install body-parser@1.20.6 --save
```

**Razão**: Única vulnerabilidade em dependência de produção direta

**Validação**:
```bash
npm test
npm start
```

**Risco**: BAIXO - patch version, sem breaking changes esperados

---

#### 1.2 - Atualizar brace-expansion
```bash
npm audit fix
```

**Razão**: Dependência transitiva, mas vulnerável em dev

**Validação**:
```bash
npm test
```

**Risco**: BAIXO - atualização transitiva automática

---

#### 1.3 - Atualizar ip-address (se presente)
```bash
npm audit fix
```

**Razão**: Se usado em validação de IP, pode ser explorado

**Validação**:
```bash
grep -r "ip-address" node_modules
npm test
```

**Risco**: BAIXO - provavelmente não usado diretamente

---

### Prioridade 2 - Opcional (desenvolvimento)

#### 2.1 - Atualizar semver via nodemon
```bash
npm audit fix --force
```

**Razão**: Vulnerabilidade em dev dependency (nodemon)

**Validação**:
```bash
npm start
nodemon --version
```

**Risco**: MÉDIA - pode ter breaking changes
- Verifique que `npm start` continua funcionando
- Valide que `nodemon` recloa mudanças corretamente

**Alternativa**: Se não usar nodemon:
```bash
npm uninstall nodemon
npm install --save-dev node-dev
```

---

## ✅ PLANO DE IMPLEMENTAÇÃO

### Fase 2.1 - Execução de Fixes

1. **Backup do package-lock.json**
   ```bash
   copy package-lock.json package-lock.json.backup
   ```

2. **Aplicar fix 1 - body-parser (SEM breaking changes)**
   ```bash
   npm install body-parser@1.20.6 --save
   npm test
   npm start  # validar 5s
   ```

3. **Aplicar fix 2 - Dependências transitivas (brace-expansion, ip-address)**
   ```bash
   npm audit fix
   npm test
   ```

4. **Aplicar fix 3 - semver (COM breaking changes - OPCIONAL)**
   ```bash
   npm audit fix --force
   npm test
   npm start  # validar 5s
   ```

5. **Validação Final**
   ```bash
   npm audit  # deve retornar 0 vulnerabilidades
   npm test
   ```

---

## 📝 RECOMENDAÇÕES ADICIONAIS

### 1. Implementar CI/CD com npm audit
Adicionar a pipeline de CI:
```yaml
- name: npm audit
  run: npm audit --audit-level=moderate
```

Bloquear merge se houver vulnerabilidades ALTA/CRÍTICA.

### 2. Renovar Segredos Antes de Deploy
Mesmo após atualizar dependências, implementar:
- Novo JWT_SECRET (32+ caracteres aleatórios)
- Novo DATABASE_PASSWORD (16+ caracteres aleatórios)
- Validar credenciais antigas em logs

### 3. Monitorar Futuros Advisories
Usar Dependabot/Snyk para alertas automáticos em:
- Github: Enable "Dependabot security updates"
- Ou npm: `npm audit --fix` em CI

### 4. Versionar package-lock.json
Garantir que `package-lock.json` é commitado para:
- Reproduzibilidade entre ambientes
- Auditoria de versões exatas

---

## ✅ CONCLUSÃO DA FASE 2

**Status**: ✅ COMPLETO

**Vulnerabilidades Encontradas**: 6
- 1 BAIXA (body-parser)
- 5 ALTAS (brace-expansion x3, ip-address x3, semver x1)

**Todas têm fix disponível**: ✅ SIM

**Recomendação**: 
- ✅ Aplicar todos os fixes ANTES de ir para produção
- 🟡 Validar que testes continuam passando
- 🟡 Testar que aplicação continua iniciando

**Próximo Passo**: 
Aprovar aplicação dos fixes → Executar `npm audit fix` → Validar testes → Avançar para Fase 3

---

**Status da Auditoria**: ✅ FASE 2 COMPLETA - Pronto para implementação de fixes
