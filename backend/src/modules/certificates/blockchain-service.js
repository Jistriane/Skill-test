const { ethers } = require('ethers');
const certificateRepository = require('./certificate-repository');

/**
 * Serviço para interação com a blockchain Ethereum
 */
class BlockchainService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        this.contractAddress = null;
        this.isInitialized = false;
    }

    /**
     * Inicializar conexão com a blockchain
     */
    async initialize() {
        try {
            // Configurar provider
            const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
            if (!rpcUrl) {
                throw new Error('BLOCKCHAIN_RPC_URL não configurada');
            }

            this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);

            // Configurar wallet
            const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
            if (!privateKey) {
                throw new Error('BLOCKCHAIN_PRIVATE_KEY não configurada');
            }

            this.wallet = new ethers.Wallet(privateKey, this.provider);

            // Configurar contrato
            this.contractAddress = process.env.CERTIFICATE_CONTRACT_ADDRESS;
            if (!this.contractAddress) {
                throw new Error('CERTIFICATE_CONTRACT_ADDRESS não configurado');
            }

            // ABI do contrato (apenas as funções necessárias)
            const contractABI = [
                "function issueCertificate(address _studentWallet, string memory _studentId, string memory _certificateType, string memory _ipfsHash) external returns (bytes32)",
                "function verifyCertificate(bytes32 _certificateHash) external view returns (bool isValid, tuple(uint256 id, address studentWallet, string studentId, string certificateType, string ipfsHash, uint256 issuedAt, address issuedBy, bool isValid) certificate)",
                "function getStudentCertificates(string memory _studentId) external view returns (bytes32[] memory)",
                "function revokeCertificate(bytes32 _certificateHash) external",
                "function getContractInfo() external view returns (address contractOwner, uint256 totalCertificates)",
                "event CertificateIssued(bytes32 indexed certificateHash, string indexed studentId, string certificateType, string ipfsHash, uint256 issuedAt)",
                "event CertificateRevoked(bytes32 indexed certificateHash, string indexed studentId, uint256 revokedAt)"
            ];

            this.contract = new ethers.Contract(this.contractAddress, contractABI, this.wallet);

            // Testar conexão
            await this.provider.getNetwork();
            console.log('✅ Conexão com blockchain estabelecida');

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar blockchain:', error.message);
            throw error;
        }
    }

    /**
     * Verificar se o serviço está inicializado
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('Serviço blockchain não inicializado. Chame initialize() primeiro.');
        }
    }

    /**
     * Emitir certificado na blockchain
     */
    async issueCertificate(certificateData) {
        this.ensureInitialized();

        try {
            const { studentWallet, studentId, certificateType, ipfsHash } = certificateData;

            // Estimar gas
            const gasEstimate = await this.contract.issueCertificate.estimateGas(
                studentWallet,
                studentId,
                certificateType,
                ipfsHash
            );

            // Obter preço do gas
            const gasPrice = await this.provider.getFeeData();

            // Executar transação
            const tx = await this.contract.issueCertificate(
                studentWallet,
                studentId,
                certificateType,
                ipfsHash, {
                    gasLimit: gasEstimate,
                    gasPrice: gasPrice.gasPrice
                }
            );

            console.log(`📤 Transação enviada: ${tx.hash}`);

            // Aguardar confirmação
            const receipt = await tx.wait();
            console.log(`✅ Transação confirmada no bloco: ${receipt.blockNumber}`);

            // Extrair o hash do certificado dos eventos
            const certificateHash = this.extractCertificateHashFromReceipt(receipt);

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                blockHash: receipt.blockHash,
                certificateHash: certificateHash,
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: gasPrice.gasPrice.toString()
            };

        } catch (error) {
            console.error('❌ Erro ao emitir certificado:', error);
            throw new Error(`Falha ao emitir certificado na blockchain: ${error.message}`);
        }
    }

    /**
     * Verificar certificado na blockchain
     */
    async verifyCertificate(certificateHash) {
        this.ensureInitialized();

        try {
            const result = await this.contract.verifyCertificate(certificateHash);

            return {
                isValid: result[0],
                certificate: {
                    id: result[1].id.toString(),
                    studentWallet: result[1].studentWallet,
                    studentId: result[1].studentId,
                    certificateType: result[1].certificateType,
                    ipfsHash: result[1].ipfsHash,
                    issuedAt: new Date(Number(result[1].issuedAt) * 1000),
                    issuedBy: result[1].issuedBy,
                    isValid: result[1].isValid
                }
            };
        } catch (error) {
            console.error('❌ Erro ao verificar certificado:', error);
            throw new Error(`Falha ao verificar certificado: ${error.message}`);
        }
    }

    /**
     * Obter certificados de um aluno
     */
    async getStudentCertificates(studentId) {
        this.ensureInitialized();

        try {
            const certificateHashes = await this.contract.getStudentCertificates(studentId);

            const certificates = [];
            for (const hash of certificateHashes) {
                const verification = await this.verifyCertificate(hash);
                certificates.push({
                    hash: hash,
                    ...verification
                });
            }

            return certificates;
        } catch (error) {
            console.error('❌ Erro ao obter certificados do aluno:', error);
            throw new Error(`Falha ao obter certificados: ${error.message}`);
        }
    }

    /**
     * Revogar certificado
     */
    async revokeCertificate(certificateHash) {
        this.ensureInitialized();

        try {
            // Estimar gas
            const gasEstimate = await this.contract.revokeCertificate.estimateGas(certificateHash);

            // Obter preço do gas
            const gasPrice = await this.provider.getFeeData();

            // Executar transação
            const tx = await this.contract.revokeCertificate(certificateHash, {
                gasLimit: gasEstimate,
                gasPrice: gasPrice.gasPrice
            });

            console.log(`📤 Transação de revogação enviada: ${tx.hash}`);

            // Aguardar confirmação
            const receipt = await tx.wait();
            console.log(`✅ Certificado revogado no bloco: ${receipt.blockNumber}`);

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                blockHash: receipt.blockHash,
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: gasPrice.gasPrice.toString()
            };

        } catch (error) {
            console.error('❌ Erro ao revogar certificado:', error);
            throw new Error(`Falha ao revogar certificado: ${error.message}`);
        }
    }

    /**
     * Obter informações do contrato
     */
    async getContractInfo() {
        this.ensureInitialized();

        try {
            const [owner, totalCertificates] = await this.contract.getContractInfo();

            return {
                contractAddress: this.contractAddress,
                owner: owner,
                totalCertificates: totalCertificates.toString(),
                network: (await this.provider.getNetwork()).name
            };
        } catch (error) {
            console.error('❌ Erro ao obter informações do contrato:', error);
            throw new Error(`Falha ao obter informações do contrato: ${error.message}`);
        }
    }

    /**
     * Extrair hash do certificado dos eventos da transação
     */
    extractCertificateHashFromReceipt(receipt) {
        try {
            for (const log of receipt.logs) {
                try {
                    const parsedLog = this.contract.interface.parseLog(log);
                    if (parsedLog.name === 'CertificateIssued') {
                        return parsedLog.args.certificateHash;
                    }
                } catch (error) {
                    continue;
                }
            }
            throw new Error('Hash do certificado não encontrado nos eventos');
        } catch (error) {
            console.error('❌ Erro ao extrair hash do certificado:', error);
            throw error;
        }
    }

    /**
     * Obter saldo da conta
     */
    async getBalance() {
        this.ensureInitialized();

        try {
            const balance = await this.provider.getBalance(this.wallet.address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('❌ Erro ao obter saldo:', error);
            throw new Error(`Falha ao obter saldo: ${error.message}`);
        }
    }

    /**
     * Monitorar eventos do contrato
     */
    async startEventMonitoring() {
        this.ensureInitialized();

        try {
            // Monitorar eventos de certificados emitidos
            this.contract.on('CertificateIssued', async(certificateHash, studentId, certificateType, ipfsHash, issuedAt, event) => {
                console.log('🎉 Novo certificado emitido:', {
                    certificateHash,
                    studentId,
                    certificateType,
                    ipfsHash,
                    issuedAt: new Date(Number(issuedAt) * 1000),
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash
                });

                // Atualizar banco de dados
                try {
                    await this.updateCertificateInDatabase(certificateHash, event.transactionHash, 'confirmed');
                } catch (error) {
                    console.error('❌ Erro ao atualizar certificado no banco:', error);
                }
            });

            // Monitorar eventos de certificados revogados
            this.contract.on('CertificateRevoked', async(certificateHash, studentId, revokedAt, event) => {
                console.log('🚫 Certificado revogado:', {
                    certificateHash,
                    studentId,
                    revokedAt: new Date(Number(revokedAt) * 1000),
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash
                });

                // Atualizar banco de dados
                try {
                    await this.updateCertificateInDatabase(certificateHash, event.transactionHash, 'revoked');
                } catch (error) {
                    console.error('❌ Erro ao atualizar certificado revogado no banco:', error);
                }
            });

            console.log('👂 Monitoramento de eventos iniciado');
        } catch (error) {
            console.error('❌ Erro ao iniciar monitoramento de eventos:', error);
            throw error;
        }
    }

    /**
     * Atualizar certificado no banco de dados
     */
    async updateCertificateInDatabase(certificateHash, transactionHash, status) {
        try {
            const certificate = await certificateRepository.findCertificateByBlockchainHash(certificateHash);
            if (certificate) {
                await certificateRepository.updateCertificateStatus(
                    certificate.id,
                    status,
                    certificate.approved_by, { blockchain_tx_hash: transactionHash }
                );
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar certificado no banco:', error);
            throw error;
        }
    }
}

// Exportar a classe e uma instância singleton
module.exports = BlockchainService;
module.exports.instance = new BlockchainService();