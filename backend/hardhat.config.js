require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

/**
 * Configuração do Hardhat para deploy estável
 * Versões: Hardhat 2.17.0 + ethers 5.7.2 + Solidity 0.8.19
 */

module.exports = {
    solidity: {
        version: "0.8.19",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },

    networks: {
        // Rede local para desenvolvimento
        hardhat: {
            chainId: 31337
        },

        // Rede Sepolia Testnet
        sepolia: {
            url: process.env.BLOCKCHAIN_RPC_URL || "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
            accounts: process.env.BLOCKCHAIN_PRIVATE_KEY ? [process.env.BLOCKCHAIN_PRIVATE_KEY] : [],
            chainId: 11155111,
            gasPrice: 20000000000, // 20 gwei
            gas: 6000000
        },

        // Rede Goerli (alternativa)
        goerli: {
            url: process.env.GOERLI_RPC_URL || "https://goerli.infura.io/v3/YOUR_PROJECT_ID",
            accounts: process.env.BLOCKCHAIN_PRIVATE_KEY ? [process.env.BLOCKCHAIN_PRIVATE_KEY] : [],
            chainId: 5,
            gasPrice: 20000000000,
            gas: 6000000
        }
    },

    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },

    mocha: {
        timeout: 40000
    }
};