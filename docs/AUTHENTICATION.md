# Autenticacao institucional

## Fluxo

1. `POST /api/auth/login` normaliza o email e busca o usuario no PostgreSQL por meio de `src/repositories/userRepository.js`.
2. A senha informada e comparada com `users.password_hash` usando bcrypt.
3. Um JWT de curta duracao e emitido.
4. Somente o hash SHA-256 do JWT e salvo em `sessions`; o token puro nao e persistido no banco.
5. O middleware valida assinatura, usuario ativo e sessao nao revogada antes de liberar a rota.
6. `POST /api/auth/logout` revoga a sessao no PostgreSQL.

## Dados sensiveis

Senhas nunca sao retornadas pela API. O campo `password_hash` nao e incluido nas respostas. O arquivo `storage/users.json` nao participa do fluxo de autenticacao real.

## RBAC

O usuario possui `role_id` em `users`, relacionado a `roles`. As permissoes sao relacionadas por `roles_permissions`. O middleware `authorize` deve ser usado nas rotas que exigem uma permissao especifica; `requireAdmin` permanece como compatibilidade para o perfil NGE.

## Lotacao

A lotacao canonica e `users.organizational_unit_id`, relacionada a `organizational_units_v2`. A hierarquia usa `parent_id`.

## Auditoria

Os eventos `USER_LOGIN`, `USER_LOGOUT` e `PASSWORD_CHANGED` sao gravados em `audit_logs` sem senha, token ou hash de senha.

## Operacao

O ambiente oficial usa `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` e `DATABASE_PASSWORD`. `TEST_DATABASE_URL` e considerado somente em execucoes explicitamente marcadas como teste.
