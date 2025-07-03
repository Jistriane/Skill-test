const { ethers } = require("hardhat");

/**
 * Script para verificar saldo da carteira e conexão com a rede
 */

async function checkBalance() {
    try {
        console.log("🔍 Verificando configurações de deploy...");

        // Obter informações da rede
        const network = await ethers.provider.getNetwork();
        console.log("📡 Rede conectada:", network.name);
        console.log("🆔 Chain ID:", network.chainId);

        // Verificar se é Sepolia
        if (network.chainId !== 11155111 && network.chainId !== 31337) {
            console.log("⚠️ Aviso: Não está conectado na Sepolia Testnet");
        }

        // Obter contas
        const [deployer] = await ethers.getSigners();
        console.log("👤 Endereço da carteira:", deployer.address);

        // Verificar saldo
        const balance = await deployer.getBalance();
        const balanceEth = ethers.utils.formatEther(balance);
        console.log("💰 Saldo atual:", balanceEth, "ETH");

        // Verificar se tem saldo suficiente
        const minBalance = ethers.utils.parseEther("0.01"); // 0.01 ETH mínimo
        if (balance.lt(minBalance)) {
            console.log("❌ Saldo insuficiente para deploy!");
            console.log("💡 Obtenha ETH Sepolia em:");
            console.log("   - https://sepoliafaucet.com");
            console.log("   - https://faucet.sepolia.dev");
            return false;
        }

        // Estimar custo de deploy
        try {
            const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
            const deployTransaction = CertificateRegistry.getDeployTransaction();
            const estimatedGas = await ethers.provider.estimateGas(deployTransaction);
            const gasPrice = await ethers.provider.getGasPrice();
            const estimatedCost = estimatedGas.mul(gasPrice);

            console.log("⛽ Gas estimado:", estimatedGas.toString());
            console.log("💸 Custo estimado:", ethers.utils.formatEther(estimatedCost), "ETH");

            if (balance.gt(estimatedCost.mul(120).div(100))) {
                console.log("✅ Saldo suficiente para deploy!");
                return true;
            } else {
                console.log("⚠️ Saldo pode ser insuficiente (margem de 20%)");
                return false;
            }
        } catch (error) {
            console.log("⚠️ Não foi possível estimar gas:", error.message);
            return balanceEth > 0.005; // Fallback: pelo menos 0.005 ETH
        }

    } catch (error) {
        console.error("❌ Erro ao verificar saldo:", error.message);

        if (error.message.includes("invalid project id")) {
            console.log("💡 Verifique se o BLOCKCHAIN_RPC_URL está correto no .env");
        } else if (error.message.includes("private key")) {
            console.log("💡 Verifique se o BLOCKCHAIN_PRIVATE_KEY está correto no .env");
        }

        return false;
    }
}

if (require.main === module) {
    checkBalance()
        .then((success) => {
            if (success) {
                console.log("\n🎉 Pronto para deploy!");
                process.exit(0);
            } else {
                console.log("\n❌ Configure os requisitos antes do deploy");
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error("❌ Erro:", error.message);
            process.exit(1);
        });
}

module.exports = checkBalance;