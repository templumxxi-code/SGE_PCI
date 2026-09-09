# Controle de acesso hierarquico

## Regra

O acesso canonico combina perfil, permissao e lotacao. `NGE_ADMIN` e global. Os demais usuarios recebem a propria unidade e seus descendentes pela CTE recursiva de `src/middleware/scopeAccess.js`.

## Hierarquia

`organizational_units_v2` usa `parent_id` para representar Instituto, Regional, Assessoria, Nucleo e Setor. O indice unico impede duplicidade de `nome + tipo + parent_id`, e a restricao impede que uma unidade seja pai de si mesma.

## Middleware

- `verifyToken` valida JWT, usuario ativo e sessao no PostgreSQL.
- `authorize` consulta `user_roles`, `roles_permissions` e `permissions`.
- `checkScopeAccess` valida a unidade do recurso e registra `DATA_ACCESS_DENIED` em `audit_logs`.
- A listagem canonica de usuarios aplica o escopo da lotacao.
- Unidades raiz tambem obedecem a unicidade por nome e tipo; `NULL` em `parent_id` nao permite duplicacao.

## UUID

Usuarios, roles, permissoes, unidades e registros canonicos usam UUID. A rota canonica `/api/users/:id` consulta UUID. Processos e controllers BPM legados permanecem numericos nesta etapa, conforme o limite da Sprint 2.1.2.

## Limite atual

O modulo Processos ainda usa `processos.setor_id` legado. Portanto, o isolamento hierarquico completo de processos, indicadores, relatorios e anexos depende da migracao BPM posterior e nao deve ser tratado como concluido nesta Sprint.
