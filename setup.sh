#!/bin/bash

# ============================================================================
# SMP PCI - Script de Inicialização Rápida
# Execute este script para configurar o projeto rapidamente
# ============================================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   SMP PCI - Sistema de Monitoramento de Processos BPM      ║"
echo "║   Polícia Científica do Rio Grande do Norte                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Cor para outputs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}[1] Instalando dependências...${NC}"
npm install

echo ""
echo -e "${BLUE}[2] Verificando PostgreSQL...${NC}"

# Verificar se psql está disponível
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️ PostgreSQL não está instalado. Instale antes de continuar.${NC}"
    echo "   Linux: sudo apt-get install postgresql"
    echo "   Mac: brew install postgresql"
    echo "   Windows: Baixe em https://www.postgresql.org/download/windows/"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL encontrado${NC}"

echo ""
echo -e "${BLUE}[3] Criando arquivo .env...${NC}"

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Arquivo .env criado${NC}"
    echo -e "${YELLOW}⚠️ Edite o arquivo .env com suas credenciais do PostgreSQL${NC}"
else
    echo -e "${YELLOW}⚠️ Arquivo .env já existe${NC}"
fi

echo ""
echo -e "${BLUE}[4] Configurando banco de dados...${NC}"

# Ler credenciais do .env
DB_NAME=$(grep "^DB_NAME=" .env | cut -d '=' -f 2)
DB_USER=$(grep "^DB_USER=" .env | cut -d '=' -f 2)

# Criar banco de dados
echo "   Criando banco de dados: $DB_NAME..."
createdb -U $DB_USER $DB_NAME 2>/dev/null || true

# Executar schema
echo "   Executando schema..."
psql -U $DB_USER -d $DB_NAME -f database/schema.sql

# Executar seed (opcional)
read -p "   Deseja carregar dados de teste? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    psql -U $DB_USER -d $DB_NAME -f database/seed.sql
    echo -e "${GREEN}✓ Dados de teste carregados${NC}"
fi

echo ""
echo -e "${GREEN}═════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup concluído com sucesso!${NC}"
echo -e "${GREEN}═════════════════════════════════════════════════════════════${NC}"

echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Edite .env com suas configurações"
echo "2. Execute: npm run dev"
echo "3. Acesse: http://localhost:3000"
echo ""
echo -e "${YELLOW}Credenciais de teste:${NC}"
echo "  Email: admin@pci.rn.gov.br"
echo "  Senha: admin123"
echo ""
