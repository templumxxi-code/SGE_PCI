# Changelog de Segurança

## 2026-07-10

### Arquivos alterados
- [src/server.js](src/server.js): adição de helmet, CORS restritivo, rate limiting para login e validação de JWT_SECRET.
- [src/middleware/auth.js](src/middleware/auth.js): validação de token mais robusta, verificação de usuário ativo e invalidação por sessão.
- [src/controllers/authController.js](src/controllers/authController.js): mensagens de erro genéricas, expiração explícita do JWT e hash com custo maior.
- [src/controllers/processController.js](src/controllers/processController.js): aplicação de autorização por setor e bloqueio de acesso indevido.
- [src/controllers/indicatorController.js](src/controllers/indicatorController.js): bloqueio de acesso indevido a indicadores com base no setor do usuário.
- [src/routes/reports.js](src/routes/reports.js): filtros de relatório aplicados no backend para restringir dados ao setor do usuário.
- [package.json](package.json): scripts de teste ajustados para Node.js 18+.
- [test/functional/security-auth.test.js](test/functional/security-auth.test.js): novo teste de autenticação e autorização.
- [test/functional/role-access.test.js](test/functional/role-access.test.js): teste funcional atualizado para iniciar o servidor e validar fluxos reais.

### Impacto
- Redução de risco de acesso indevido por setor.
- Melhor proteção contra tentativa de brute-force no login.
- Menor vazamento de detalhes em erros de autenticação.
- Servidor mais alinhado com padrões básicos de segurança para produção.
