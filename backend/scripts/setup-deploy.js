const fs = require('fs');
const path = require('path');

/**
 * Script para configurar ambiente de deploy do contrato
 * Configura .env e verifica dependências
 */

function setupDeploy() {
    console.log("🔧 Configurando ambiente de deploy...");

    // Verificar se .env existe
    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', '.env-example');

    if (!fs.existsSync(envPath)) {
        console.log("📋 Criando arquivo .env a partir do .env-example...");
        fs.copyFileSync(envExamplePath, envPath);
        console.log("✅ Arquivo .env criado!");
    }

    console.log("\n📝 CONFIGURAÇÕES NECESSÁRIAS PARA DEPLOY:");
    console.log("=".repeat(60));

    console.log("\n1. 🔑 CHAVE PRIVADA DA CARTEIRA:");
    console.log("   - Exporte sua chave privada da MetaMask");
    console.log("   - Adicione no .env: BLOCKCHAIN_PRIVATE_KEY=suachaveprivada");
    console.log("   - ⚠️ NUNCA compartilhe sua chave privada!");

    console.log("\n2. 🌐 RPC URL (escolha uma opção):");
    console.log("   A) Infura (recomendado):");
    console.log("      - Acesse: https://infura.io");
    console.log("      - Crie projeto e copie endpoint Sepolia");
    console.log("      - BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/SEU_PROJECT_ID");
    console.log("\n   B) Alchemy:");
    console.log("      - Acesse: https://alchemy.com");
    console.log("      - BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/SEU_API_KEY");
    console.log("\n   C) RPC Público (sem garantias):");
    console.log("      - BLOCKCHAIN_RPC_URL=https://rpc.sepolia.org");

    console.log("\n3. 💰 ETH SEPOLIA TESTNET:");
    console.log("   - Obtenha ETH grátis em faucets:");
    console.log("   - https://sepoliafaucet.com");
    console.log("   - https://faucet.sepolia.dev");
    console.log("   - Precisa de ~0.01 ETH para deploy");

    console.log("\n4. 🔍 VERIFICAÇÃO:");
    console.log("   - Verifique saldo: npx hardhat run scripts/check-balance.js --network sepolia");
    console.log("   - Teste conexão: npx hardhat run scripts/test-connection.js --network sepolia");

    console.log("\n5. 🚀 DEPLOY:");
    console.log("   - Deploy local: npx hardhat run scripts/deploy-hardhat.js");
    console.log("   - Deploy Sepolia: npx hardhat run scripts/deploy-hardhat.js --network sepolia");

    console.log("\n⚡ COMANDOS RÁPIDOS:");
    console.log("=".repeat(60));
    console.log("npm run blockchain:compile  # Compilar contrato");
    console.log("npm run blockchain:deploy   # Deploy na Sepolia");
    console.log("npm run blockchain:verify   # Verificar contrato");
    console.log("npm run blockchain:test     # Testar contrato");
}

// Criar scripts package.json se não existir
function updatePackageScripts() {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    const blockchainScripts = {
        "blockchain:compile": "npx hardhat compile",
        "blockchain:deploy": "npx hardhat run scripts/deploy-hardhat.js --network sepolia",
        "blockchain:deploy-local": "npx hardhat run scripts/deploy-hardhat.js",
        "blockchain:verify": "npx hardhat run scripts/check-balance.js --network sepolia",
        "blockchain:test": "npx hardhat run scripts/test-contract.js --network sepolia"
    };

    // Adicionar scripts se não existirem
    packageJson.scripts = {...packageJson.scripts, ...blockchainScripts };

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log("\n✅ Scripts npm atualizados!");
}

if (require.main === module) {
    setupDeploy();
    updatePackageScripts();
}

module.exports = { setupDeploy, updatePackageScripts };