<!-- 
SMP PCI - Sistema de Monitoramento de Processos BPM

Instruções de Desenvolvimento e Deployment para Copilot
Polícia Científica do Rio Grande do Norte
-->

# SMP PCI - Sistema Completo de Monitoramento de Processos BPM

## 🎯 Objetivo
Criar um sistema web completo, moderno e responsivo para monitoramento de processos seguindo a metodologia BPM (Planejar, Analisar, Desenhar, Implementar, Monitorar) com autenticação segura, dashboards interativos e controle de acesso por perfil.

## ✅ Status Atual
Sistema criado e estruturado com:
- ✅ Banco de dados PostgreSQL (schema completo)
- ✅ Backend Node.js/Express com API RESTful segura
- ✅ Frontend HTML5/CSS3/JavaScript responsivo
- ✅ Autenticação JWT + criptografia bcryptjs
- ✅ Dashboards interativos com gráficos Chart.js
- ✅ Controle de acesso por perfil (NGE e SETOR)
- ✅ Gerenciamento de processos, indicadores e relatórios
- ✅ Logs de auditoria completos
- ✅ Design moderno com identidade visual do PCI-RN

## 📋 Tecnologias Utilizadas
- **Frontend**: HTML5, CSS3, JavaScript ES6+, Chart.js
- **Backend**: Node.js, Express.js, PostgreSQL
- **Segurança**: JWT, bcryptjs, CORS
- **Deploy**: Preparado para Heroku/AWS/Digital Ocean

## 🚀 Como Usar

### Desenvolvimento Local
1. Instalar Node.js e PostgreSQL
2. Executar `npm install`
3. Configurar `.env` com credenciais PostgreSQL
4. Executar `psql -U postgres -d smp_pci -f database/schema.sql`
5. Executar `npm run dev`
6. Acessar `http://localhost:3000`

### Credenciais de Teste
- **Admin**: admin@pci.rn.gov.br / admin123
- **Setor**: setor@pci.rn.gov.br / setor123

## 📁 Estrutura Criada
- `/public` - Frontend (HTML, CSS, JS)
- `/src` - Backend (rotas, controllers, middleware)
- `/database` - Schema PostgreSQL
- `/package.json` - Dependências
- `/README.md` - Documentação do projeto
- `/DEVELOPMENT.md` - Guia de desenvolvimento

## 🔑 Funcionalidades Principais
1. **Login Seguro** - Autenticação JWT
2. **Dashboard NGE** - Visão geral institucional
3. **Dashboard Setor** - Visão específica do setor
4. **Gerenciamento de Processos** - CRUD completo
5. **Indicadores KPI** - Monitoramento de metas
6. **Relatórios** - Exportação de dados
7. **Monitoramento BPM** - Acompanhamento por fase
8. **Configurações** - Gerenciamento de usuários

## 🔒 Segurança Implementada
- Senhas hasheadas com bcryptjs
- Tokens JWT com expiração
- Validação de inputs (frontend + backend)
- Proteção SQL injection com prepared statements
- CORS configurado
- Logs de auditoria completos

## 📈 Próximas Etapas Recomendadas
1. Integrar com LDAP corporativo
2. Implementar exportação PDF/Excel
3. Adicionar WebSocket para atualizações em tempo real
4. Implementar notificações por email
5. Adicionar testes automatizados
6. Configurar CI/CD
7. Deploy para produção

## 📖 Documentação
- `README.md` - Visão geral do projeto
- `DEVELOPMENT.md` - Guia de desenvolvimento
- Comentários nos códigos-fonte

## ✨ Notas Importantes
- Sistema pronto para desenvolvimento imediato
- Identidade visual do PCI-RN implementada
- Responsivo para desktop e tablets
- API RESTful bem estruturada
- Código modular e reutilizável
