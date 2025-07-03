#!/bin/bash

# Script para inicializar o sistema de certificados blockchain
# Autor: Sistema de Gestão Escolar com Blockchain
# Data: $(date +%Y-%m-%d)

echo "🚀 Iniciando Sistema de Certificados Blockchain..."
echo "================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logs coloridos
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está no diretório correto
if [ ! -f "Readme.md" ]; then
    log_error "Execute este script a partir do diretório raiz do projeto!"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js não está instalado!"
    exit 1
fi

log_info "Node.js versão: $(node --version)"

# Verificar npm
if ! command -v npm &> /dev/null; then
    log_error "npm não está instalado!"
    exit 1
fi

log_info "npm versão: $(npm --version)"

# Verificar PostgreSQL
check_postgresql() {
    if command -v psql &> /dev/null; then
        log_info "PostgreSQL encontrado: $(psql --version | head -n1)"
        return 0
    else
        log_warning "PostgreSQL não encontrado - certifique-se de que está instalado e rodando"
        return 1
    fi
}

# Função para verificar se uma porta está em uso
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Verificar dependências blockchain
check_blockchain_deps() {
    log_info "Verificando dependências blockchain..."
    
    cd backend
    
    # Verificar se hardhat está instalado
    if [ -f "node_modules/.bin/hardhat" ]; then
        log_success "Hardhat encontrado"
    else
        log_warning "Hardhat não encontrado - será instalado com as dependências"
    fi
    
    # Verificar se o contrato existe
    if [ -f "contracts/CertificateRegistry.sol" ]; then
        log_success "Smart contract encontrado"
    else
        log_error "Smart contract não encontrado em contracts/CertificateRegistry.sol"
        cd ..
        return 1
    fi
    
    # Verificar se há artifacts compilados
    if [ -d "artifacts/contracts" ]; then
        log_success "Artifacts do contrato encontrados"
    else
        log_warning "Artifacts não encontrados - contrato será compilado"
    fi
    
    cd ..
    return 0
}

# Verificar e configurar variáveis de ambiente
setup_env_vars() {
    local env_file="$1"
    local env_example="$1-example"
    
    if [ ! -f "$env_file" ]; then
        if [ -f "$env_example" ]; then
            log_info "Copiando $env_example para $env_file..."
            cp "$env_example" "$env_file"
        else
            log_error "Arquivo $env_example não encontrado!"
            return 1
        fi
    fi
    
    # Verificar variáveis críticas do blockchain
    if [ "$env_file" = "backend/.env" ]; then
        local missing_vars=()
        
        # Verificar se as variáveis blockchain essenciais estão configuradas
        if ! grep -q "^BLOCKCHAIN_RPC_URL=" "$env_file" || grep -q "YOUR_INFURA_PROJECT_ID" "$env_file"; then
            missing_vars+=("BLOCKCHAIN_RPC_URL")
        fi
        
        if ! grep -q "^BLOCKCHAIN_PRIVATE_KEY=" "$env_file" || grep -q "your_private_key_here" "$env_file"; then
            missing_vars+=("BLOCKCHAIN_PRIVATE_KEY")
        fi
        
        if ! grep -q "^CERTIFICATE_CONTRACT_ADDRESS=" "$env_file" || grep -q "0x1234567890123456789012345678901234567890" "$env_file"; then
            missing_vars+=("CERTIFICATE_CONTRACT_ADDRESS")
        fi
        
        # Verificar variáveis do banco de dados
        if ! grep -q "^DB_PASSWORD=" "$env_file"; then
            log_info "Adicionando configuração de senha do banco de dados..."
            echo "" >> "$env_file"
            echo "# Configurações do Banco de Dados Local" >> "$env_file"
            echo "DB_HOST=localhost" >> "$env_file"
            echo "DB_PORT=5432" >> "$env_file"
            echo "DB_NAME=school_mgmt" >> "$env_file"
            echo "DB_USER=jistriane" >> "$env_file"
            echo "DB_PASSWORD=dev123" >> "$env_file"
        fi
        
        if [ ${#missing_vars[@]} -gt 0 ]; then
            log_warning "Variáveis blockchain não configuradas: ${missing_vars[*]}"
            log_warning "Configure estas variáveis em $env_file para funcionalidades blockchain completas"
            log_info "Use './start-system.sh deploy-contract' para fazer deploy do contrato"
        fi
    fi
    
    return 0
}

# Função para compilar e fazer deploy do contrato
deploy_contract() {
    log_info "Fazendo deploy do contrato blockchain..."
    
    cd backend
    
    # Verificar se as dependências estão instaladas
    if [ ! -d "node_modules" ]; then
        log_info "Instalando dependências..."
        npm install
    fi
    
    # Verificar configuração
    if ! grep -q "^BLOCKCHAIN_RPC_URL=" .env || grep -q "YOUR_INFURA_PROJECT_ID" .env; then
        log_error "BLOCKCHAIN_RPC_URL não configurada em backend/.env"
        log_info "Configure uma URL RPC válida (ex: Infura, Alchemy) para continuar"
        cd ..
        return 1
    fi
    
    if ! grep -q "^BLOCKCHAIN_PRIVATE_KEY=" .env || grep -q "your_private_key_here" .env; then
        log_error "BLOCKCHAIN_PRIVATE_KEY não configurada em backend/.env"
        log_info "Configure uma chave privada válida para continuar"
        cd ..
        return 1
    fi
    
    # Compilar contrato
    log_info "Compilando contrato..."
    npx hardhat compile
    
    if [ $? -ne 0 ]; then
        log_error "Falha na compilação do contrato"
        cd ..
        return 1
    fi
    
    # Fazer deploy
    log_info "Fazendo deploy na rede Sepolia..."
    node scripts/deploy-hardhat.js
    
    if [ $? -eq 0 ]; then
        log_success "Deploy do contrato realizado com sucesso!"
        log_info "Atualize a variável CERTIFICATE_CONTRACT_ADDRESS no .env"
    else
        log_error "Falha no deploy do contrato"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

# Verificar banco de dados
check_database() {
    log_info "Verificando banco de dados..."
    
    # Tentar conectar ao banco
    if psql -h localhost -U jistriane -d school_mgmt -c "SELECT 1;" &>/dev/null; then
        log_success "Conexão com banco de dados estabelecida"
        
        # Verificar se as tabelas de certificados existem
        if psql -h localhost -U jistriane -d school_mgmt -c "SELECT 1 FROM certificates LIMIT 1;" &>/dev/null; then
            log_success "Tabelas de certificados encontradas"
        else
            log_warning "Tabelas de certificados não encontradas"
            if [ -f "backend/database/certificates-schema-fixed.sql" ]; then
                log_info "Schema de certificados disponível para instalação"
            fi
        fi
    else
        log_warning "Não foi possível conectar ao banco de dados"
        log_info "Certifique-se de que o PostgreSQL está rodando e configurado"
    fi
}

# Função para inicializar o backend
start_backend() {
    log_info "Iniciando Backend..."
    
    cd backend
    
    # Configurar variáveis de ambiente
    setup_env_vars ".env"
    
    # Instalar dependências se necessário
    if [ ! -d "node_modules" ]; then
        log_info "Instalando dependências do backend..."
        npm install
    fi
    
    # Verificar se a porta 5000 está disponível
    if check_port 5000; then
        log_warning "Porta 5000 já está em uso!"
        log_info "Tentando parar processo existente..."
        pkill -f "node.*server.js" || true
        sleep 2
    fi
    
    # Verificar banco de dados
    check_database
    
    # Iniciar servidor backend
    log_info "Iniciando servidor backend na porta 5000..."
    npm run dev &
    BACKEND_PID=$!
    
    # Aguardar backend inicializar
    sleep 8
    
    if check_port 5000; then
        log_success "Backend iniciado com sucesso!"
    else
        log_error "Falha ao iniciar backend!"
        kill $BACKEND_PID 2>/dev/null || true
        cd ..
        exit 1
    fi
    
    cd ..
}

# Função para inicializar o frontend
start_frontend() {
    log_info "Iniciando Frontend..."
    
    cd frontend
    
    # Configurar variáveis de ambiente
    setup_env_vars ".env"
    
    # Verificar se .env tem configuração correta
    if [ -f ".env" ]; then
        if ! grep -q "VITE_API_BASE_URL" .env; then
            log_info "Adicionando configuração da API..."
            echo "VITE_API_BASE_URL=http://localhost:5000/api/v1" >> .env
            echo "VITE_APP_NAME=Sistema de Certificados Blockchain" >> .env
        fi
    fi
    
    # Instalar dependências se necessário
    if [ ! -d "node_modules" ]; then
        log_info "Instalando dependências do frontend..."
        npm install
    fi
    
    # Verificar se a porta 5173 está disponível
    if check_port 5173; then
        log_warning "Porta 5173 já está em uso!"
        log_info "Tentando parar processo existente..."
        pkill -f "vite" || true
        sleep 2
    fi
    
    # Iniciar servidor frontend
    log_info "Iniciando servidor frontend na porta 5173..."
    npm run dev &
    FRONTEND_PID=$!
    
    # Aguardar frontend inicializar
    sleep 5
    
    if check_port 5173; then
        log_success "Frontend iniciado com sucesso!"
    else
        log_error "Falha ao iniciar frontend!"
        kill $FRONTEND_PID 2>/dev/null || true
        cd ..
        exit 1
    fi
    
    cd ..
}

# Função para exibir status do sistema
show_status() {
    echo ""
    echo "📊 Status do Sistema:"
    echo "===================="
    
    if check_port 5000; then
        log_success "Backend: ✅ Rodando na porta 5000"
        echo "         🔗 http://localhost:5000"
        echo "         📡 API: http://localhost:5000/api/v1"
    else
        log_error "Backend: ❌ Não está rodando"
    fi
    
    if check_port 5173; then
        log_success "Frontend: ✅ Rodando na porta 5173"
        echo "          🔗 http://localhost:5173"
    else
        log_error "Frontend: ❌ Não está rodando"
    fi
    
    # Verificar PostgreSQL
    if check_postgresql; then
        if psql -h localhost -U jistriane -d school_mgmt -c "SELECT 1;" &>/dev/null; then
            log_success "PostgreSQL: ✅ Conectado (school_mgmt)"
        else
            log_warning "PostgreSQL: ⚠️ Instalado mas não conectado"
        fi
    else
        log_error "PostgreSQL: ❌ Não encontrado"
    fi
    
    # Verificar configuração blockchain
    if [ -f "backend/.env" ]; then
        cd backend
        if grep -q "^CERTIFICATE_CONTRACT_ADDRESS=" .env && ! grep -q "0x1234567890123456789012345678901234567890" .env; then
            log_success "Blockchain: ✅ Contrato configurado"
        else
            log_warning "Blockchain: ⚠️ Contrato não configurado"
        fi
        cd ..
    fi
    
    echo ""
    echo "🔧 Comandos úteis:"
    echo "=================="
    echo "• Parar sistema: Ctrl+C ou ./start-system.sh stop"
    echo "• Ver logs backend: tail -f backend/logs/app.log"
    echo "• Deploy contrato: ./start-system.sh deploy-contract"
    echo "• Compilar contrato: ./start-system.sh compile-contract"
    echo "• Verificar contrato: ./start-system.sh verify-contract"
    echo "• Reiniciar: ./start-system.sh restart"
    echo ""
    echo "📚 Documentação:"
    echo "================"
    echo "• API Backend: http://localhost:5000/api/v1"
    echo "• Certificados: http://localhost:5000/api/v1/certificates"
    echo "• Blockchain: Sepolia Testnet"
    echo "• IPFS: Integrado com fallback local"
    echo ""
    echo "🔐 Credenciais Demo:"
    echo "==================="
    echo "• Email: admin@school-admin.com"
    echo "• Senha: 30U4zn3q6Zh9"
    echo ""
}

# Função para limpeza ao sair
cleanup() {
    log_info "Parando sistema..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Parar qualquer processo restante
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    log_success "Sistema parado com sucesso!"
    exit 0
}

# Capturar sinais para limpeza
trap cleanup SIGINT SIGTERM

# Menu principal
case "${1:-start}" in
    "start")
        log_info "Iniciando sistema completo..."
        
        # Verificar dependências
        check_postgresql
        check_blockchain_deps
        
        start_backend
        start_frontend
        show_status
        
        log_info "Sistema iniciado! Pressione Ctrl+C para parar."
        
        # Manter script rodando
        while true; do
            sleep 10
            
            # Verificar se os serviços ainda estão rodando
            if ! check_port 5000 || ! check_port 5173; then
                log_error "Um dos serviços parou inesperadamente!"
                cleanup
            fi
        done
        ;;
        
    "backend")
        check_postgresql
        check_blockchain_deps
        start_backend
        log_info "Backend iniciado! Pressione Ctrl+C para parar."
        wait $BACKEND_PID
        ;;
        
    "frontend")
        start_frontend
        log_info "Frontend iniciado! Pressione Ctrl+C para parar."
        wait $FRONTEND_PID
        ;;
        
    "status")
        show_status
        ;;
        
    "stop")
        log_info "Parando todos os serviços..."
        pkill -f "node.*server.js" 2>/dev/null || true
        pkill -f "vite" 2>/dev/null || true
        log_success "Serviços parados!"
        ;;
        
    "restart")
        log_info "Reiniciando sistema..."
        pkill -f "node.*server.js" 2>/dev/null || true
        pkill -f "vite" 2>/dev/null || true
        sleep 3
        exec "$0" start
        ;;
        
    "deploy-contract")
        deploy_contract
        ;;
        
    "compile-contract")
        log_info "Compilando contrato blockchain..."
        cd backend
        npx hardhat compile
        cd ..
        ;;
        
    "verify-contract")
        log_info "Verificando contrato blockchain..."
        cd backend
        node scripts/deploy-contract.js
        cd ..
        ;;
        
    "setup-db")
        log_info "Configurando banco de dados..."
        if [ -f "backend/database/certificates-schema-fixed.sql" ]; then
            psql -h localhost -U jistriane -d school_mgmt -f backend/database/certificates-schema-fixed.sql
            log_success "Schema de certificados instalado!"
        else
            log_error "Schema não encontrado"
        fi
        ;;
        
    "test-blockchain")
        log_info "Testando conexão blockchain..."
        cd backend
        node -e "
        require('dotenv').config();
        const { ethers } = require('ethers');
        
        async function test() {
            try {
                const provider = new ethers.providers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
                const network = await provider.getNetwork();
                console.log('✅ Conectado à rede:', network.name, 'Chain ID:', network.chainId);
                
                if (process.env.CERTIFICATE_CONTRACT_ADDRESS && process.env.CERTIFICATE_CONTRACT_ADDRESS !== '0x1234567890123456789012345678901234567890') {
                    console.log('✅ Endereço do contrato configurado:', process.env.CERTIFICATE_CONTRACT_ADDRESS);
                } else {
                    console.log('⚠️ Endereço do contrato não configurado');
                }
            } catch (error) {
                console.error('❌ Erro:', error.message);
            }
        }
        test();
        "
        cd ..
        ;;
        
    "help"|"--help"|"-h")
        echo "Sistema de Certificados Blockchain"
        echo ""
        echo "Uso: $0 [comando]"
        echo ""
        echo "Comandos principais:"
        echo "  start               Iniciar sistema completo (padrão)"
        echo "  backend             Iniciar apenas backend"
        echo "  frontend            Iniciar apenas frontend"
        echo "  status              Mostrar status dos serviços"
        echo "  stop                Parar todos os serviços"
        echo "  restart             Reiniciar sistema completo"
        echo ""
        echo "Comandos blockchain:"
        echo "  deploy-contract     Fazer deploy do smart contract"
        echo "  compile-contract    Compilar smart contract"
        echo "  verify-contract     Verificar contrato existente"
        echo "  test-blockchain     Testar conexão blockchain"
        echo ""
        echo "Comandos de banco:"
        echo "  setup-db            Instalar schema de certificados"
        echo ""
        echo "Exemplos:"
        echo "  $0                  # Iniciar sistema completo"
        echo "  $0 backend          # Iniciar apenas backend"
        echo "  $0 status           # Ver status"
        echo "  $0 deploy-contract  # Fazer deploy do contrato"
        echo ""
        ;;
        
    *)
        log_error "Comando inválido: $1"
        echo "Use '$0 help' para ver os comandos disponíveis."
        exit 1
        ;;
esac 