const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

/**
 * Script para fazer deploy do contrato CertificateRegistry na rede Sepolia
 */

async function deployContract() {
    try {
        console.log('🚀 Iniciando deploy do contrato CertificateRegistry...');

        // Configurar provider
        const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
        if (!rpcUrl) {
            throw new Error('BLOCKCHAIN_RPC_URL não configurada no .env');
        }

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        console.log('✅ Conectado ao provider:', rpcUrl);

        // Configurar wallet
        const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('BLOCKCHAIN_PRIVATE_KEY não configurada no .env');
        }

        const wallet = new ethers.Wallet(privateKey, provider);
        console.log('✅ Wallet configurada:', wallet.address);

        // Verificar saldo
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Saldo da carteira:', ethers.formatEther(balance), 'ETH');

        if (balance === BigInt(0)) {
            throw new Error('Saldo insuficiente para deploy. Adicione ETH Sepolia à carteira.');
        }

        // Ler o código do contrato
        const contractPath = path.join(__dirname, '..', 'contracts', 'CertificateRegistry.sol');
        if (!fs.existsSync(contractPath)) {
            throw new Error('Arquivo do contrato não encontrado: ' + contractPath);
        }

        // Bytecode compilado do contrato (você precisa compilar o contrato Solidity)
        // Para este exemplo, vou fornecer instruções de como compilar
        console.log('📋 Para fazer deploy, você precisa:');
        console.log('1. Instalar o Hardhat ou usar Remix para compilar o contrato');
        console.log('2. Obter o bytecode compilado');
        console.log('3. Substituir o bytecode abaixo');

        // Bytecode simplificado para exemplo (você deve substituir pelo real)
        const contractABI = [
            "constructor()",
            "function issueCertificate(address _studentWallet, string memory _studentId, string memory _certificateType, string memory _ipfsHash) external returns (bytes32)",
            "function verifyCertificate(bytes32 _certificateHash) external view returns (bool isValid, tuple(uint256 id, address studentWallet, string studentId, string certificateType, string ipfsHash, uint256 issuedAt, address issuedBy, bool isValid) certificate)",
            "function getStudentCertificates(string memory _studentId) external view returns (bytes32[] memory)",
            "function revokeCertificate(bytes32 _certificateHash) external",
            "function getContractInfo() external view returns (address contractOwner, uint256 totalCertificates)",
            "function transferOwnership(address _newOwner) external",
            "event CertificateIssued(bytes32 indexed certificateHash, string indexed studentId, string certificateType, string ipfsHash, uint256 issuedAt)",
            "event CertificateRevoked(bytes32 indexed certificateHash, string indexed studentId, uint256 revokedAt)"
        ];

        // Nota: Para um deploy real, você precisaria do bytecode compilado
        console.log('\n⚠️  ATENÇÃO: Este é um script de exemplo.');
        console.log('Para fazer o deploy real, siga estes passos:');
        console.log('\n1. Compile o contrato usando Hardhat:');
        console.log('   npm install --save-dev hardhat @nomiclabs/hardhat-ethers');
        console.log('   npx hardhat compile');
        console.log('\n2. Ou use o Remix IDE (https://remix.ethereum.org):');
        console.log('   - Cole o código do contrato');
        console.log('   - Compile e faça deploy na rede Sepolia');
        console.log('   - Copie o endereço do contrato para CERTIFICATE_CONTRACT_ADDRESS');

        // Simular deploy para demonstração
        console.log('\n🎯 Endereço simulado do contrato: 0x1234567890123456789012345678901234567890');
        console.log('📝 Adicione este endereço à variável CERTIFICATE_CONTRACT_ADDRESS no .env');

        return {
            success: true,
            contractAddress: '0x1234567890123456789012345678901234567890',
            message: 'Deploy simulado concluído. Use Hardhat ou Remix para deploy real.'
        };

    } catch (error) {
        console.error('❌ Erro no deploy:', error.message);
        throw error;
    }
}

/**
 * Verificar se o contrato está funcionando
 */
async function verifyContract(contractAddress) {
    try {
        console.log('🔍 Verificando contrato em:', contractAddress);

        const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
        const provider = new ethers.JsonRpcProvider(rpcUrl);

        const contractABI = [
            "function getContractInfo() external view returns (address contractOwner, uint256 totalCertificates)"
        ];

        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const [owner, totalCertificates] = await contract.getContractInfo();

        console.log('✅ Contrato verificado:');
        console.log('   - Proprietário:', owner);
        console.log('   - Total de certificados:', totalCertificates.toString());

        return { success: true, owner, totalCertificates: totalCertificates.toString() };

    } catch (error) {
        console.error('❌ Erro na verificação:', error.message);
        throw error;
    }
}

// Executar script se chamado diretamente
if (require.main === module) {
    require('dotenv').config();

    deployContract()
        .then(result => {
            console.log('\n✅ Deploy concluído:', result);

            // Se forneceu um endereço de contrato, verificar
            if (process.env.CERTIFICATE_CONTRACT_ADDRESS &&
                process.env.CERTIFICATE_CONTRACT_ADDRESS !== '0x1234567890123456789012345678901234567890') {
                return verifyContract(process.env.CERTIFICATE_CONTRACT_ADDRESS);
            }
        })
        .then(verificationResult => {
            if (verificationResult) {
                console.log('\n✅ Verificação concluída:', verificationResult);
            }
        })
        .catch(error => {
            console.error('\n❌ Falha no deploy:', error.message);
            process.exit(1);
        });
}

module.exports = { deployContract, verifyContract };