# Implementação do sistema de módulos

## Migration e tabelas

Foi criada a migration `database/migrations/0020_modules_access.sql`, executada pelo migrador existente. Ela cria:

- `modules`, com os módulos `PROCESS_MANAGEMENT` e `STRATEGIC_PLANNING`;
- `user_modules`, com chaves estrangeiras, unicidade por usuário/módulo e índices.

Usuários ativos existentes recebem somente `PROCESS_MANAGEMENT` por migration. Planejamento Estratégico não é liberado por padrão.

## Backend

Arquivos adicionados:

- `src/repositories/moduleRepository.js`
- `src/middleware/moduleAccess.js`
- `src/routes/modules.js`

Endpoints adicionados:

- `GET /api/modules`
- `GET /api/admin/users/:id/modules`
- `POST /api/admin/users/:id/modules`
- `DELETE /api/admin/users/:id/modules/:moduleId`

Os endpoints administrativos usam `verifyToken` e `requireAdmin`. O middleware `requireModule` consulta o PostgreSQL a cada validação e foi aplicado às rotas legadas de processos e às rotas BPM.

## Frontend

Arquivos adicionados:

- `public/js/modules.js`
- `public/css/modules.css`

O login agora direciona para `/modules`. O card de Gestão de Processos abre o dashboard existente. O card de Planejamento Estratégico abre `/strategic-planning` e exibe somente a mensagem de desenvolvimento. A tela de configurações ganhou o gerenciamento de módulos por usuário.

## Impacto

- JWT, usuários, perfis, permissões, `authorize` e `requireAdmin` foram preservados.
- A autorização de módulo não é armazenada no JWT.
- Acesso direto às APIs de processos sem `PROCESS_MANAGEMENT` retorna `403`.
- O dashboard e as funcionalidades existentes continuam sendo usados como ambiente do módulo de processos.

## Validações

Foram executados:

- diagnóstico estático dos arquivos alterados, sem erros;
- validação de sintaxe JavaScript dos novos arquivos e arquivos backend alterados;
- `npm test`.

O fluxo esperado é: login → `/modules` → módulo autorizado → ambiente correspondente.

## Riscos e pendências

- Como o JWT é armazenado no `localStorage`, uma navegação HTML direta não envia o token no cabeçalho HTTP; a página estratégica valida novamente o módulo pela API antes de exibir seu conteúdo. As APIs protegidas continuam bloqueando acesso sem autorização.
- O teste contra PostgreSQL de produção deve ser realizado somente pelo processo normal de migration, sem inserções manuais.
