@echo off
REM ============================================================================
REM SMP PCI - Script de Inicialização Rápida (Windows)
REM Execute este script para configurar o projeto rapidamente
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   SMP PCI - Sistema de Monitoramento de Processos BPM      ║
echo ║   Polícia Científica do Rio Grande do Norte                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1] Instalando dependências...
call npm install

echo.
echo [2] Criando arquivo .env...

if not exist ".env" (
    copy .env.example .env
    echo ✓ Arquivo .env criado
    echo ⚠️ Edite o arquivo .env com suas credenciais do PostgreSQL
) else (
    echo ⚠️ Arquivo .env já existe
)

echo.
echo [3] Informações do PostgreSQL
echo Certifique-se de que o PostgreSQL está instalado e rodando
echo Database: smp_pci
echo User: postgres
echo Host: localhost
echo Port: 5432

echo.
echo ═════════════════════════════════════════════════════════════
echo Setup concluído com sucesso!
echo ═════════════════════════════════════════════════════════════

echo.
echo Próximos passos:
echo 1. Abra pgAdmin ou DBeaver e crie o banco de dados: smp_pci
echo 2. Execute o script: database/schema.sql
echo 3. Edite .env com suas configurações
echo 4. Execute: npm run dev
echo 5. Acesse: http://localhost:3000

echo.
echo Credenciais de teste:
echo   Email: admin@pci.rn.gov.br
echo   Senha: admin123
echo.

pause
