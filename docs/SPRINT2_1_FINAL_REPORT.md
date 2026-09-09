# Relatorio final da Sprint 2.1

Data: 2026-08-25

## Status

**BLOQUEADA**

O login real, sessoes hash-only e auditoria basica de autenticacao foram implementados e validados. A Sprint nao pode ser declarada concluida porque algumas rotas administrativas ainda assumem IDs numericos legados e a camada de autorizacao por permissao precisa ser aplicada rota a rota.

## Arquivos alterados ou criados

- `src/repositories/userRepository.js`: acesso ao PostgreSQL para usuarios, roles e lotacao.
- `src/repositories/sessionRepository.js`: hash SHA-256, criacao, validacao e revogacao de sessoes.
- `src/controllers/authController.js`: login, cadastro, alteracao de senha e consulta de usuarios via PostgreSQL.
- `src/middleware/auth.js`: validacao de usuario e sessao sem fallback para JSON.
- `src/routes/auth.js`: logout com revogacao em `sessions`.
- `database/migrations/0007_auth_sessions.sql`: `sessions` e `user_roles`.
- `scripts/migrate-passwords.js`: migracao de senhas explicitas para bcrypt.
- `docs/SPRINT2_1_AUTH_AUDIT.md`: auditoria das fontes de autenticacao.
- `docs/AUTHENTICATION.md`: fluxo, RBAC, sessoes e auditoria.

## Banco e dados

- Banco utilizado: `sge_pci`.
- Usuario de aplicacao: `sge_app`.
- Tabelas utilizadas: `users`, `roles`, `permissions`, `roles_permissions`, `user_roles`, `organizational_units_v2`, `sessions` e `audit_logs`.
- A migration `0007_auth_sessions.sql` foi executada com sucesso.
- Os dados locais foram previamente carregados no schema canonico por `npm run migrate:local`, com backup em `storage/backups`.
- O administrador migrado `admin@pci.rn.gov.br` autenticou com sucesso no PostgreSQL.

## Testes executados

- Sintaxe dos repositorios, controller, middleware e rotas: aprovada.
- Login real: `200`.
- Logout: `204`.
- Acesso com token revogado: `401`.
- PostgreSQL e migration `0007`: aprovados.

## Seguranca

- Senhas sao comparadas com bcrypt e nao retornadas.
- Tokens puros nao sao armazenados no banco; somente SHA-256 em `sessions`.
- Sessoes expiradas ou revogadas sao recusadas.
- O middleware nao usa mais `users.json` como fallback de autenticacao.
- Auditoria registra `USER_LOGIN`, `USER_LOGOUT` e `PASSWORD_CHANGED`.

## Pendencias para Sprint 2.2

1. Aplicar `authorize(permission)` nas rotas de processos, usuarios, dashboards e auditoria.
2. Corrigir rotas administrativas para aceitar IDs UUID canonicos.
3. Registrar `LOGIN_FAILED` sem dados sensiveis.
4. Migrar completamente os stores de processos e remover `localStorage` institucional.
5. Executar a suite completa em banco de teste isolado e registrar o resultado final.
