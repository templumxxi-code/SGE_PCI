# Implementação de Múltiplos Perfis para Usuários

## 📋 Resumo das Mudanças

Foi implementado um sistema que permite que cada usuário tenha **múltiplos níveis de acesso/perfis**. Quando um usuário faz login, ele pode selecionar qual perfil deseja usar.

## ✅ O Que Foi Implementado

### 1. **Backend - Modelo de Usuário Atualizado**
**Arquivo**: `src/models/userStore.js`

- ✅ Adicionada função `normalizeProfiles()` que converte um perfil único ou array de perfis para um array normalizado
- ✅ Modificada função `normalizeUser()` para armazenar um array de `perfis` (múltiplos) mantendo compatibilidade com `perfil` (único)
- ✅ Modificada função `createUser()` para aceitar `perfis` (array) e manter compatibilidade com `perfil`
- ✅ Exportada função `normalizeProfiles` para uso em outros módulos

**Exemplo de usuário com múltiplos perfis:**
```json
{
  "id": 123,
  "nome": "João Silva",
  "email": "joao@pci.rn.gov.br",
  "perfis": ["DIRETOR_INSTITUTO", "ASSESSOR"],
  "perfil": "DIRETOR_INSTITUTO"  // Compatibilidade
}
```

### 2. **Backend - API de Perfis Disponíveis**
**Arquivo**: `src/controllers/authController.js`

- ✅ Adicionada função `obterPerfisDisponíveis(email)` que retorna todos os perfis disponíveis para um email
- ✅ Modificada função `login()` para aceitar um parâmetro opcional `perfil`
- ✅ Validação: se um perfil específico for solicitado no login, verifica se o usuário tem esse perfil

**Novo endpoint**: `POST /api/auth/perfis-disponiveis`
```json
{
  "email": "usuario@pci.rn.gov.br"
}
```

**Resposta**:
```json
{
  "encontrado": true,
  "perfis": [
    { "id": "DIRETOR_INSTITUTO", "nome": "DIRETOR_INSTITUTO" },
    { "id": "ASSESSOR", "nome": "ASSESSOR" }
  ],
  "usuario": {
    "id": 123,
    "nome": "João Silva",
    "email": "joao@pci.rn.gov.br"
  }
}
```

### 3. **Backend - Rota de Login Atualizada**
**Arquivo**: `src/routes/auth.js`

- ✅ Modificada rota `POST /api/auth/login` para aceitar parâmetro opcional `perfil`
- ✅ Adicionada rota `POST /api/auth/perfis-disponiveis` para buscar perfis de um email

**Payload do login com perfil específico:**
```json
{
  "email": "usuario@pci.rn.gov.br",
  "senha": "senha123",
  "perfil": "DIRETOR_INSTITUTO"
}
```

### 4. **Frontend - Função de Busca de Perfis**
**Arquivo**: `public/js/auth.js`

- ✅ Adicionado método `AuthManager.getProfilesForEmail(email)` que faz requisição para buscar perfis de um email

### 5. **Frontend - Página de Login**
**Arquivo**: `public/js/app.js`

- ✅ Adicionado evento de `blur` no campo de email que dispara `updateProfilesForEmail()`
- ✅ Adicionada função `updateProfilesForEmail()` que:
  - Busca os perfis disponíveis para o email digitado
  - Atualiza o select de perfis com as opções disponíveis
  - Mostra "ACESSAR COM: [Nome do Perfil]" para cada opção
- ✅ Modificada função `handleLogin()` para enviar o perfil selecionado na requisição de login

### 6. **Frontend - Formulário de Criação de Usuários**
**Arquivo**: `public/index.html` e `public/js/settings.js`

- ✅ Modificado select de perfil para aceitar **múltiplas seleções** (atributo `multiple`)
- ✅ Alterada label de "Perfil" para "Perfis (selecione um ou mais)"
- ✅ Modificada função `validateForm()` para:
  - Aceitar múltiplos perfis (Array.from(selectedOptions))
  - Exigir pelo menos um perfil selecionado
  - Validação simplificada de unidades organizacionais
- ✅ Modificada função `createUser()` para:
  - Enviar array de `perfis` junto com `perfil` (compatibilidade)
- ✅ Modificada função `refreshFormFields()` para mostrar campos relevantes com base nos perfis selecionados
- ✅ Modificada função `renderUsersTable()` para exibir todos os perfis de um usuário

## 🎯 Como Funciona

### Fluxo de Login com Múltiplos Perfis

1. **Admin cria usuário com múltiplos perfis**:
   - Acessa página de Configurações
   - Clica em "Adicionar Usuário"
   - Seleciona múltiplos perfis (ex: Diretor de Instituto + Assessor)
   - Salva o usuário

2. **Usuário faz login**:
   - Digita seu email
   - Quando sai do campo de email (blur), a página busca seus perfis disponíveis
   - O select "Acessar com" é atualizado mostrando: "ACESSAR COM: Diretor de Instituto" e "ACESSAR COM: Assessor"
   - Usuário seleciona o perfil desejado
   - Digita senha e clica em "Entrar"
   - Sistema envia email + senha + perfil selecionado
   - Backend valida se o usuário tem esse perfil
   - Token é gerado com o perfil específico selecionado

3. **Dentro do sistema**:
   - Usuário tem acesso baseado no perfil selecionado no login
   - Pode fazer logout e logar novamente com outro perfil

## 🔄 Compatibilidade

- ✅ Usuários antigos com apenas 1 perfil continuam funcionando normalmente
- ✅ O campo `perfil` (singular) é mantido para compatibilidade
- ✅ API aceita tanto `perfil` quanto `perfis` ao criar/atualizar usuários
- ✅ Todos os perfis são normalizados antes de armazenar

## 🧪 Como Testar

### Teste 1: Criar usuário com múltiplos perfis
1. Faça login como admin
2. Vá para Configurações → Gerenciamento de Usuários
3. Clique em "Adicionar Usuário"
4. Selecione múltiplos perfis (ex: Diretor de Instituto + Assessor)
5. Preencha os demais dados e salve
6. Verifique se o usuário foi criado com "Diretor de Instituto, Assessor" na coluna de Perfil

### Teste 2: Login com seleção de perfil
1. Faça logout
2. Na página de login, digite o email do usuário criado acima
3. Quando sair do campo de email, verifique se o select "Acessar com" mostra os perfis
4. Selecione um perfil
5. Digite a senha e faça login
6. Verifique se o usuário está logado com o perfil selecionado

### Teste 3: Trocar de perfil
1. Após logar com um perfil, faça logout
2. Digite o mesmo email novamente
3. Selecione um perfil diferente
4. Faça login
5. Verifique se o sistema está usando o novo perfil

## 📝 Notas Técnicas

- Os perfis são armazenados como array JSON no arquivo `storage/users.json`
- A validação de perfil ocorre tanto no frontend quanto no backend
- O token JWT contém apenas o perfil específico selecionado no login
- A função `normalizeProfiles` remove duplicatas automaticamente
- Se nenhum perfil for fornecido ao criar um usuário, o padrão é 'OPERACIONAL'

## 🚀 Próximos Passos Recomendados

1. Implementar interface visual melhorada para seleção de múltiplos perfis
2. Adicionar histórico de logins com os perfis utilizados
3. Implementar notificação quando novos perfis forem adicionados a um usuário
4. Adicionar opção para trocar de perfil sem fazer logout
5. Implementar testes automatizados para o fluxo de múltiplos perfis

## 📚 Arquivos Modificados

- ✅ `src/models/userStore.js` - Modelo de usuário com múltiplos perfis
- ✅ `src/controllers/authController.js` - Lógica de autenticação e busca de perfis
- ✅ `src/routes/auth.js` - Rotas de autenticação e perfis
- ✅ `public/js/auth.js` - Gerenciador de autenticação (frontend)
- ✅ `public/js/app.js` - Lógica principal do app (frontend)
- ✅ `public/index.html` - Formulário de criação de usuários
- ✅ `public/js/settings.js` - Gerenciador de configurações (frontend)

## ✨ Status

✅ **IMPLEMENTAÇÃO COMPLETA**

Todas as funcionalidades foram implementadas com sucesso. O sistema agora suporta:
- Múltiplos perfis por usuário
- Seleção de perfil no login
- Busca dinâmica de perfis quando o email é digitado
- Compatibilidade com dados antigos
- Validação completa no backend e frontend
