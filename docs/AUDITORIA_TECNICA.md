# Auditoria Técnica - SMP PCI BPM

## Escopo

Esta auditoria avaliou o código real do projeto, sem confiar apenas em documentação, e focou em estabilização, segurança e correções críticas no módulo BPM atual.

## Arquitetura real encontrada

- Servidor Express iniciado em [src/server.js](src/server.js)
- Rotas de autenticação, processos, indicadores e relatórios em [src/routes](src/routes)
- Autenticação via JWT em [src/middleware/auth.js](src/middleware/auth.js)
- Banco PostgreSQL conectado via pool em [src/models/db.js](src/models/db.js)
- Frontend estático em [public](public)

## Fluxo real de autenticação

1. O cliente envia e-mail e senha para /api/auth/login.
2. O backend valida formato básico e tenta localizar o usuário no banco.
3. O hash da senha é comparado com bcrypt.
4. Em caso de sucesso, gera um JWT com expiração explícita de 15 minutos.
5. O token é usado em rotas protegidas via middleware de autenticação.

## Fluxo real de autorização

1. O middleware verifica o token.
2. O usuário autenticado é carregado do banco.
3. Usuários do perfil SETOR têm acesso restrito ao próprio setor.
4. Usuários NGE têm acesso amplo aos recursos globais.
5. O backend bloqueia acesso indevido por setor em rotas de processos e indicadores.

## Cinco maiores riscos comprovados

1. Autenticação retornava mensagens internas e inconsistentes em falhas de login.
2. O servidor não tinha proteção básica contra brute-force no login.
3. O backend não aplicava bloqueio forte de acesso por setor em todos os fluxos.
4. O Express estava com configuração insegura e sem headers de segurança adequados.
5. A documentação do projeto estava desatualizada em relação ao sistema real.

## Correções aplicadas

### Crítica

- Login passou a retornar mensagem genérica "Credenciais inválidas." para não vazar detalhes.
- JWT passou a ter expiração explícita e sem fallback inseguro.
- Middleware de autenticação passou a validar usuário ativo e negar sessão antiga.
- Rotas de processos e indicadores passaram a aplicar autorização por setor no backend.
- O servidor passou a usar helmet, CORS restritivo e limitador de login.

### Média

- Testes automatizados foram criados para autenticação e autorização.
- Configuração de ambiente passou a exigir JWT_SECRET em produção.
- Documentação foi alinhada ao estado real do projeto.

## Riscos remanescentes

- O projeto ainda depende de dados e autenticação em modo mock para execução local sem banco.
- Uploads não foram implementados de forma robusta no escopo atual desta auditoria.
- A documentação de produção ainda precisa ser revisada em um ambiente real com PostgreSQL configurado.
