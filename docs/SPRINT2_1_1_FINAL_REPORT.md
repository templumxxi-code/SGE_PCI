# Relatorio final da Sprint 2.1.1

Data: 2026-08-25

## Status

**BLOQUEADA**

O RBAC por permissao, o registro de tentativas, o bloqueio de forca bruta e a auditoria de autenticacao foram implementados. A Sprint ainda nao pode ser declarada concluida porque algumas rotas administrativas e de processos permanecem legadas, com tabelas e IDs numericos, e o controle de lotacao ainda precisa ser aplicado a todos os controllers.

## Tabelas criadas ou utilizadas

- `roles`, `permissions`, `roles_permissions`, `user_roles`.
- `users`, `organizational_units_v2`.
- `sessions`, `login_attempts`, `audit_logs`.

Migrations aplicadas: `0007_auth_sessions.sql` e `0008_rbac_security.sql`.

## Perfis e permissoes

Foram mantidos os perfis cadastrados no schema canonico e associadas permissoes para administrador NGE, NGE e perfis de setor. O middleware `authorize` agora consulta as permissoes reais no PostgreSQL.

## Rotas protegidas

- `/api/users` passou a consultar `userRepository` e exigir permissoes `USERS_EDIT`/`USERS_CREATE`.
- `/api/auth/*` exige autenticacao nas operacoes protegidas.
- O middleware registra `UNAUTHORIZED_ACCESS_ATTEMPT` antes de retornar `403`.
- O middleware de autenticacao valida usuario ativo e sessao nao revogada por UUID.

## Testes executados

- Sintaxe dos arquivos de seguranca: aprovada.
- Migrations: aprovadas.
- Login real: `200`.
- Logout: `204`.
- Token revogado: `401`.
- Cinco tentativas invalidas: bloqueio seguinte com `423` e mensagem `Usuário temporariamente bloqueado`.
- Health check: `200 connected`.

## Vulnerabilidades e riscos encontrados

1. Algumas rotas ainda usam `usuarios`, `processos` e outros IDs numericos legados.
2. O escopo hierarquico de lotacao nao esta aplicado de forma uniforme em todos os controllers.
3. `LOGIN_FAILED` para emails com formato invalido ainda precisa ser registrado sem depender de consulta de usuario.
4. O frontend mantem o token em `localStorage`; cookie HttpOnly deve ser avaliado em etapa posterior.
5. O endpoint real de notificacoes e a remocao de fontes institucionais locais permanecem fora desta Sprint.

## Pendencias para Sprint 2.2

- Converter integralmente rotas administrativas para UUID e repository canonico.
- Aplicar permissoes e escopo de lotacao em processos, relatorios e dashboards.
- Completar testes de usuario comum versus dashboard NGE e acesso entre setores.
- Registrar todos os eventos de usuario, role e permissao em `audit_logs`.
- Remover definitivamente fontes legadas apos migracao e validacao.
