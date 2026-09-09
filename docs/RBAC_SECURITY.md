# RBAC e seguranca de acesso

## Arquitetura

Toda rota protegida passa por `verifyToken` e, quando exige privilegio especifico, por `authorize({ permissions: [...] })`. O middleware consulta `user_roles`, `roles_permissions` e `permissions` no PostgreSQL antes de liberar o controller.

## Perfis

Os perfis cadastrados na base sao `NGE_ADMIN`, `NGE`, `DIRETOR`, `SUBCOORDENADOR_REGIONAL`, `SUBCOORDENADOR_INSTITUTO`, `ASSESSOR`, `CHEFE_NUCLEO`, `CHEFE_SETOR` e `OPERACIONAL`.

`NGE_ADMIN` possui acesso administrativo e global. `NGE` possui acesso institucional a processos, indicadores, relatorios e aprovacao. Perfis de setor possuem apenas permissoes de visualizacao e gestao de processos atribuidos ao setor.

## Permissoes

As permissoes oficiais sao armazenadas em `permissions` e associadas por `roles_permissions`. A tabela `user_roles` permite mais de um perfil por usuario. O frontend nao concede permissoes e nao e fonte de autorizacao.

## Lotacao

A lotacao canonica esta em `users.organizational_unit_id`, com hierarquia em `organizational_units_v2.parent_id`. O escopo de dados deve ser aplicado no controller com base nessa unidade e nas permissoes do usuario.

## UUID

Usuarios, roles, permissoes e unidades canonicas usam UUID. Endpoints canônicos devem aceitar UUID; rotas legadas numericas permanecem isoladas até a conversao completa dos controllers de processo.

## Forca bruta

`login_attempts` registra email, IP, sucesso, motivo e data. Cinco falhas no intervalo de 15 minutos bloqueiam temporariamente o usuario e retornam HTTP `423`.

## Auditoria

A tabela `audit_logs` recebe `LOGIN_SUCCESS`, `LOGIN_FAILED`, `USER_LOGOUT`, `PASSWORD_CHANGED` e `UNAUTHORIZED_ACCESS_ATTEMPT`. Nenhum token, senha ou hash e gravado nos eventos.
