# Auditoria de autenticacao da Sprint 2.1

| Item | Atual | Final | Estado |
|---|---|---|---|
| Usuarios | `storage/users.json` em `src/models/userStore.js` | PostgreSQL `users` | Em migracao |
| Senha | bcrypt no JSON e fallback local | bcrypt em `users.password_hash` | Parcial |
| Perfil | Campo JSON/legado `perfil` | `roles`, `permissions`, `user_roles` | Em migracao |
| Permissao | Middleware e regras aplicadas por perfil; mock possui outra camada | Middleware backend baseado em role/permissao | Parcial |
| Lotacao | `setor_id` legado e campos no JSON | `users.organizational_unit_id` e `organizational_units_v2.parent_id` | Parcial |
| Sessao | JWT com revogacao por timestamp em `usuarios` | `sessions.token_hash`, expiracao e revogacao | Em implementacao |
| Auditoria | Tabela legada `logs` em algumas rotas | `audit_logs` para autenticacao | Pendente |
| Frontend | Token/usuario em `localStorage` | Token continua no cliente apenas para transporte; dados institucionais no backend | Parcial |

## Fluxo atual identificado

- `authController` importa operacoes de `src/models/userStore.js`.
- `userStore` le e escreve `storage/users.json`.
- `verifyToken` consulta primeiro `usuarios` e possui fallback para o JSON.
- O JWT nao possui registro de sessao em banco.
- O login nao registra evento de autenticacao em `audit_logs`.

## Fluxo final

`POST /api/auth/login` consulta `users` com `roles`, valida `password_hash`, cria sessao com hash SHA-256 do JWT e registra `USER_LOGIN`. O middleware valida usuario ativo e sessao nao revogada. Logout revoga a sessao e registra `USER_LOGOUT`.

## Riscos mantidos para a proxima etapa

- Rotas de administracao ainda precisam ser adaptadas para IDs UUID.
- O frontend ainda armazena token em `localStorage`; isso e aceitavel apenas como transporte nesta etapa, mas cookie HttpOnly deve ser avaliado depois.
- Usuarios migrados com senha temporaria devem trocar a senha antes do uso institucional.