const { ethers } = require("hardhat");

/**
 * Script de deploy do contrato CertificateRegistry usando Hardhat
 * Versão estável: Hardhat 2.17.0 + ethers 5.7.2
 */

async function main() {
    console.log("🚀 Iniciando deploy do contrato CertificateRegistry...");

    // Obter informações da rede
    const network = await ethers.provider.getNetwork();
    console.log("📡 Rede:", network.name, "| Chain ID:", network.chainId);

    // Obter contas
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    // Verificar saldo
    const balance = await deployer.getBalance();
    console.log("💰 Saldo:", ethers.utils.formatEther(balance), "ETH");

    if (balance.isZero()) {
        throw new Error("❌ Saldo insuficiente para deploy! Adicione ETH à carteira.");
    }

    // Obter contrato factory
    console.log("📋 Compilando contrato...");
    const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");

    // Estimar gas para deploy
    const deployTransaction = CertificateRegistry.getDeployTransaction();
    const estimatedGas = await ethers.provider.estimateGas(deployTransaction);
    const gasPrice = await ethers.provider.getGasPrice();
    const estimatedCost = estimatedGas.mul(gasPrice);

    console.log("⛽ Gas estimado:", estimatedGas.toString());
    console.log("💸 Custo estimado:", ethers.utils.formatEther(estimatedCost), "ETH");

    // Confirmar se há saldo suficiente
    if (balance.lt(estimatedCost.mul(110).div(100))) { // 10% margem
        console.log("⚠️ Aviso: Saldo pode ser insuficiente para o deploy!");
    }

    // Deploy do contrato
    console.log("🔄 Fazendo deploy...");
    const certificate = await CertificateRegistry.deploy();

    console.log("⏳ Aguardando confirmação da transação...");
    await certificate.deployed();

    console.log("✅ Contrato deployado com sucesso!");
    console.log("📍 Endereço do contrato:", certificate.address);
    console.log("🔗 Transaction hash:", certificate.deployTransaction.hash);

    // Verificar informações do contrato
    console.log("🔍 Verificando contrato...");
    const [owner, totalCertificates] = await certificate.getContractInfo();
    console.log("👑 Proprietário:", owner);
    console.log("📊 Total de certificados:", totalCertificates.toString());

    // Informações para configuração
    console.log("\n📝 CONFIGURAÇÃO NECESSÁRIA:");
    console.log("=".repeat(50));
    console.log("1. Adicione ao arquivo .env:");
    console.log(`CERTIFICATE_CONTRACT_ADDRESS=${certificate.address}`);
    console.log("\n2. Verifique o contrato no Etherscan:");

    if (network.chainId === 11155111) {
        console.log(`https://sepolia.etherscan.io/address/${certificate.address}`);
    } else if (network.chainId === 5) {
        console.log(`https://goerli.etherscan.io/address/${certificate.address}`);
    }

    console.log("\n3. Teste o contrato:");
    console.log("npx hardhat run scripts/test-contract.js --network sepolia");

    return {
        contractAddress: certificate.address,
        transactionHash: certificate.deployTransaction.hash,
        owner: owner,
        network: network.name,
        chainId: network.chainId
    };
}

// Executar deploy
if (require.main === module) {
    main()
        .then((result) => {
            console.log("\n🎉 Deploy concluído com sucesso!");
            console.log("📋 Resumo:", result);
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n❌ Erro no deploy:", error.message);
            process.exit(1);
        });
}

module.exports = main;