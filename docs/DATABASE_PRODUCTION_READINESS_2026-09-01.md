# DATABASE PRODUCTION READINESS — 2026-09-01

## Resumo executivo

A validação final do banco de dados para produção foi bloqueada por falta de evidência real de conexão ao PostgreSQL real e por inconsistências observadas no ambiente de testes que usam `pg-mem`.

O arquivo [../.env](../.env) contém credenciais locais reais de PostgreSQL, incluindo `DB_PASSWORD` e `DATABASE_PASSWORD`, o que confirma que segredos locais existem no workspace e precisam ser tratados como sensíveis. Também há evidência de que o ambiente de testes está usando `pg-mem`, e o log real [../test-result.log](../test-result.log) mostra falhas do `pg-mem` ao interpretar partes do schema SQL, incluindo `plpgsql`, triggers e constraints.

Nenhuma etapa crítica foi aprovada com evidência de execução real no PostgreSQL real. Portanto, a decisão correta neste momento é:

- Estado: NO-GO
- Motivo: falta de prova real de conexão, persistência e integridade no banco de produção
- Regra cumprida: não foi alterado código de produção nem banco real

## Banco utilizado

### Evidência disponível
- O arquivo [.env](../.env) mostra a configuração local do banco:
  - `DB_HOST=localhost`
  - `DB_PORT=5432`
  - `DB_NAME=smp_pci`
  - `DB_USER=postgres`
- Também há `DATABASE_HOST=127.0.0.1`, `DATABASE_NAME=sge_pci`, `DATABASE_USER=sge_app` em [.env](../.env), indicando coexistência de configurações locais/legadas.

### Observação crítica
A configuração do projeto está ambígua: há `DB_*` e `DATABASE_*`. Isso exige validação explícita do ambiente realmente ativo antes de considerar qualquer banco como pronto para produção.

## Versão PostgreSQL

Sem realização real de `SELECT version();` no PostgreSQL real, a versão não pode ser declarada com evidência. A fase atual continua bloqueada.

## Schema

Há evidência do schema em [../database/schema.sql](../database/schema.sql) e em migrations em [../database/migrations](../database/migrations), incluindo tabelas críticas:

- `setores`
- `usuarios`
- `macroprocessos`
- `processos`
- `subprocessos`
- `atividades`
- `indicadores`
- `anexos`
- `logs`
- `organizational_units`
- `planejar` / `planejar_projetos`

Mas isso é apenas inferência de schema no código; não é prova de schema real em PostgreSQL ativo.

## Tabelas

### Evidência de software
O diretório [../database](../database) contém schema e migrations. O schema define tabelas críticas e índices.

### Estado real
Ainda não foi validado no banco real com `information_schema.tables` e contagens reais.

## Relacionamentos

### Evidência de código
`database/schema.sql` e as migrations definem FK, PK, índices e constraints. Isso é evidência do projeto, mas não da base real em produção.

### Estado real
Não há prova de que as FKs, órfãos e integridade foram validadas no PostgreSQL real.

## Constraints

Há muitos `CHECK`, `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE` e triggers em [../database/schema.sql](../database/schema.sql) e [../database/migrations](../database/migrations). Isso sinaliza intenção de integridade.

No entanto, não foi validado no PostgreSQL real. O ambiente de `pg-mem` mostrou que parte do SQL não é suportada corretamente:

- `plpgsql` não reconhecido
- `CREATE TRIGGER ...` com parse error
- `relation ... already exists`

Isso mostra que `pg-mem` não pode ser usado como prova de funcionamento do PostgreSQL real.

## Índices

Há índices críticos em [../database/schema.sql](../database/schema.sql), por exemplo:

- `idx_usuario_email`
- `idx_usuario_setor`
- `idx_processo_setor`
- `idx_processo_status`
- `idx_atividade_subprocesso`
- `idx_log_usuario`

Mas não há verificação real de `EXPLAIN ANALYZE` em banco real.

## Triggers e Functions

Há triggers e funções em [../database/schema.sql](../database/schema.sql) e migrations, como:

- `atualizar_timestamp()`
- `trigger_usuarios_timestamp`
- `trigger_processos_timestamp`
- `trigger_indicadores_timestamp`

Tais recursos foram rejeitados pelo `pg-mem`, o que reforça que o ambiente de teste não substitui PostgreSQL real.

## Integridade

Não há evidência real de:

- NULL indevido
- registros órfãos
- linhas inválidas
- duplicidade em chaves/identificadores
- regressão de integridade

A única evidência concreta é do log de erro do `pg-mem` no arquivo [../test-result.log](../test-result.log).

## Usuários e autenticação

O projeto usa `usuarios`, `sessions`, `login_attempts` e `roles` em migrations, além de usuários de teste em seed SQL. A estrutura está prevista, mas não foi validada em PostgreSQL real.

Também há credenciais reais locais em [.env](../.env) e credenciais de teste em [../test/helpers/test-credentials.js](../test/helpers/test-credentials.js). Isso exige organização rigorosa de ambientes.

## Persistência real

A persistência real não foi comprovada. O banco não foi conectado e validado com:

- `SELECT version();`
- `SELECT current_database();`
- `SELECT current_user;`
- `SELECT now();`
- inserções, consultas e verificações no PostgreSQL real

Sem esse passo, a persistência não pode ser declarada.

## Transações

Não há evidência real de:

- `BEGIN; INSERT; ROLLBACK;`
- `BEGIN; INSERT; COMMIT;`
- validação de erros dentro de transação

## Migrations

As migrations existem e a intenção é migrar o schema. Mas a execução em PostgreSQL real ainda não foi validada. Também há risco de incompatibilidade com features não suportadas por `pg-mem`, que não substitui PostgreSQL real.

## Segurança do banco

### Evidência observada
- Segredos locais reais em [.env](../.env)
- Combinação de `DB_*` e `DATABASE_*`
- uso de `pg-mem` em testes

### Conclusão
A segurança do banco não pode ser declarada adequada sem validar permissões reais e ambiente de produção.

## Backup e restore

Não há evidência de execução real de backup e restore em banco separado. Isso é bloqueador crítico para produção.

## Performance

Não foi realizada validação real com `EXPLAIN ANALYZE` em PostgreSQL real. Não há evidência com benchmark.

## Problemas encontrados

1. Ambiente local com segredos reais em [.env](../.env)
2. Configuração ambígua de banco (`DB_*` e `DATABASE_*`)
3. `pg-mem` não é prova de PostgreSQL real
4. Falhas do `pg-mem` em SQL do schema e seed
5. Ausência de conexão real ao PostgreSQL
6. Ausência de backup/restore validado
7. Ausência de prova de CRUD e persistência real
8. Ausência de validação de autenticação e RBAC contra banco real

## Correções realizadas

Até o momento, nenhuma correção de produção foi aplicada. O trabalho realizado foi de diagnóstico e identificação de bloqueadores reais, sem mexer em banco real nem em regras de negócio.

## Riscos restantes

- Banco real em produção não validado
- persistência potencialmente não existente no PostgreSQL real
- schema pode estar incompleto ou incompatível em produção
- backup/restore desconhecidos
- privilégios do usuário do banco não validados
- autenticação e RBAC não comprovados contra o banco real

## Resultado final do quadro executivo

| VALIDAÇÃO | RESULTADO |
|---|---|
| PostgreSQL real | FAIL |
| Conexão | FAIL |
| Schema | FAIL (não validado no banco real) |
| Tabelas | FAIL (não validado no banco real) |
| PKs | FAIL (não validado no banco real) |
| FKs | FAIL (não validado no banco real) |
| Constraints | FAIL (não validado no banco real) |
| Índices | FAIL (não validado no banco real) |
| Triggers | FAIL (não validado no banco real) |
| Functions | FAIL (não validado no banco real) |
| Integridade | FAIL |
| Usuários | FAIL |
| Autenticação | FAIL |
| CRUD | FAIL |
| Persistência real | FAIL |
| Transações | FAIL |
| Migrations | FAIL |
| Segurança DB | FAIL |
| Backup | FAIL |
| Restore | FAIL |
| Isolamento | FAIL |
| Aplicação + PostgreSQL | FAIL |

## Decisão final

NO-GO — BANCO NÃO APROVADO PARA PRODUÇÃO.

Motivo principal:

- não há evidência real de conexão ao PostgreSQL real;
- `pg-mem` não substitui PostgreSQL;
- schema e operações críticas não foram validadas no banco real;
- backup e restore não foram comprovados;
- segredos reais existem no workspace local.

A validação final do banco requer execução real no PostgreSQL de staging/produção, com `SELECT version()`, `information_schema`, backup, restore e fluxo completo de aplicação contra o banco real. Sem isso, qualquer declaração de aprovação seria baseada em inferência e violaria os critérios exigidos.
