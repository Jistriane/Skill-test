const certificateRepository = require('./certificate-repository');
const BlockchainService = require('./blockchain-service');
const IPFSService = require('./ipfs-service');
const ApiError = require('../../utils/api-error');

// Usar instâncias singleton
const blockchainService = BlockchainService.instance;
const ipfsService = IPFSService.instance;

/**
 * Serviço principal para gerenciamento de certificados
 */
class CertificateService {

    /**
     * Inicializar serviços blockchain e IPFS
     */
    async initialize() {
        try {
            await Promise.all([
                blockchainService.initialize(),
                ipfsService.initialize()
            ]);
            console.log('✅ Serviços de certificados inicializados');
        } catch (error) {
            console.error('❌ Erro ao inicializar serviços:', error);
            throw error;
        }
    }

    /**
     * Criar solicitação de certificado
     */
    async createCertificateRequest(requestData, userId) {
        try {
            const { student_id, certificate_type_id, achievement_data } = requestData;

            // Validar tipo de certificado
            const certificateType = await certificateRepository.findCertificateTypeById(certificate_type_id);
            if (!certificateType) {
                throw new ApiError('Tipo de certificado não encontrado', 404);
            }

            // Validar dados de conquista
            const isValidAchievement = this.validateAchievementData(achievement_data, certificateType.achievement_schema);
            if (!isValidAchievement.valid) {
                throw new ApiError(`Dados de conquista inválidos: ${isValidAchievement.errors.join(', ')}`, 400);
            }

            // Verificar se o aluno existe
            const student = await this.getStudentById(student_id);
            if (!student) {
                throw new ApiError('Aluno não encontrado', 404);
            }

            // Criar solicitação no banco
            const certificate = await certificateRepository.createCertificateRequest({
                student_id,
                certificate_type_id,
                achievement_data,
                created_by: userId
            });

            // Criar registro de aprovação inicial
            await certificateRepository.createApprovalRecord(
                certificate.id,
                userId,
                'pending',
                'Solicitação criada aguardando aprovação'
            );

            return {
                success: true,
                message: 'Solicitação de certificado criada com sucesso',
                certificate: {
                    id: certificate.id,
                    student_name: student.name,
                    certificate_type: certificateType.name,
                    status: certificate.status,
                    created_at: certificate.created_at
                }
            };

        } catch (error) {
            console.error('❌ Erro ao criar solicitação:', error);
            throw error;
        }
    }

    /**
     * Listar certificados com filtros
     */
    async listCertificates(filters = {}, userId, userRole) {
        try {
            // Se não for admin, filtrar apenas certificados do usuário
            if (userRole !== 1) { // role_id 1 = Admin
                filters.created_by = userId;
            }

            const certificates = await certificateRepository.findCertificates(filters);

            return {
                success: true,
                certificates: certificates.map(cert => ({
                    id: cert.id,
                    student_name: cert.student_name,
                    student_email: cert.student_email,
                    certificate_type: cert.certificate_type_name,
                    status: cert.status,
                    created_by: cert.created_by_name,
                    approved_by: cert.approved_by_name,
                    created_at: cert.created_at,
                    approved_at: cert.approved_at,
                    issued_at: cert.issued_at,
                    blockchain_hash: cert.blockchain_hash
                }))
            };

        } catch (error) {
            console.error('❌ Erro ao listar certificados:', error);
            throw error;
        }
    }

    /**
     * Aprovar certificado
     */
    async approveCertificate(certificateId, approverId, comments = null) {
        try {
            // Buscar certificado
            const certificate = await certificateRepository.findCertificateById(certificateId);
            if (!certificate) {
                throw new ApiError('Certificado não encontrado', 404);
            }

            if (certificate.status !== 'pending') {
                throw new ApiError('Certificado não está pendente de aprovação', 400);
            }

            // Atualizar status para aprovado
            const updatedCertificate = await certificateRepository.updateCertificateStatus(
                certificateId,
                'approved',
                approverId
            );

            // Criar registro de aprovação
            await certificateRepository.createApprovalRecord(
                certificateId,
                approverId,
                'approved',
                comments
            );

            return {
                success: true,
                message: 'Certificado aprovado com sucesso',
                certificate: updatedCertificate
            };

        } catch (error) {
            console.error('❌ Erro ao aprovar certificado:', error);
            throw error;
        }
    }

    /**
     * Rejeitar certificado
     */
    async rejectCertificate(certificateId, approverId, comments) {
        try {
            // Buscar certificado
            const certificate = await certificateRepository.findCertificateById(certificateId);
            if (!certificate) {
                throw new ApiError('Certificado não encontrado', 404);
            }

            if (certificate.status !== 'pending') {
                throw new ApiError('Certificado não está pendente de aprovação', 400);
            }

            // Atualizar status para rejeitado
            const updatedCertificate = await certificateRepository.updateCertificateStatus(
                certificateId,
                'rejected',
                approverId
            );

            // Criar registro de rejeição
            await certificateRepository.createApprovalRecord(
                certificateId,
                approverId,
                'rejected',
                comments
            );

            return {
                success: true,
                message: 'Certificado rejeitado',
                certificate: updatedCertificate
            };

        } catch (error) {
            console.error('❌ Erro ao rejeitar certificado:', error);
            throw error;
        }
    }

    /**
     * Emitir certificado na blockchain
     */
    async issueCertificate(certificateId, studentWalletAddress = null) {
        try {
            // Buscar certificado
            const certificate = await certificateRepository.findCertificateById(certificateId);
            if (!certificate) {
                throw new ApiError('Certificado não encontrado', 404);
            }

            if (certificate.status !== 'approved') {
                throw new ApiError('Certificado deve estar aprovado para ser emitido', 400);
            }

            // Se não forneceu endereço da carteira, usar endereço padrão
            const walletAddress = studentWalletAddress || '0x0000000000000000000000000000000000000000';

            // Preparar dados para IPFS
            const certificateData = {
                studentId: certificate.student_id.toString(),
                studentName: certificate.student_name,
                studentEmail: certificate.student_email,
                certificateType: certificate.certificate_type_name,
                achievementData: certificate.achievement_data,
                issuedDate: new Date().toLocaleDateString('pt-BR'),
                issuedBy: certificate.approved_by_name,
                institution: 'Sistema de Gestão Escolar'
            };

            // Upload para IPFS
            console.log('📤 Fazendo upload dos metadados para IPFS...');
            const ipfsResult = await ipfsService.uploadCertificateMetadata(certificateData);

            // Registrar transação blockchain inicial
            const blockchainData = {
                studentWallet: walletAddress,
                studentId: certificate.student_id.toString(),
                certificateType: certificate.certificate_type_name,
                ipfsHash: ipfsResult.ipfsHash
            };

            console.log('🔗 Emitindo certificado na blockchain...');
            const blockchainResult = await blockchainService.issueCertificate(blockchainData);

            // Registrar transação no banco
            await certificateRepository.createBlockchainTransaction({
                certificate_id: certificateId,
                transaction_hash: blockchainResult.transactionHash,
                transaction_type: 'issue',
                gas_used: parseInt(blockchainResult.gasUsed),
                gas_price: parseInt(blockchainResult.gasPrice),
                status: 'confirmed'
            });

            // Atualizar certificado com dados da blockchain
            const updatedCertificate = await certificateRepository.updateCertificateStatus(
                certificateId,
                'issued',
                certificate.approved_by, {
                    blockchain_hash: blockchainResult.certificateHash,
                    blockchain_tx_hash: blockchainResult.transactionHash,
                    ipfs_hash: ipfsResult.ipfsHash,
                    ipfs_url: ipfsResult.url
                }
            );

            return {
                success: true,
                message: 'Certificado emitido com sucesso na blockchain',
                certificate: {
                    id: updatedCertificate.id,
                    student_name: certificate.student_name,
                    certificate_type: certificate.certificate_type_name,
                    blockchain_hash: blockchainResult.certificateHash,
                    transaction_hash: blockchainResult.transactionHash,
                    ipfs_hash: ipfsResult.ipfsHash,
                    ipfs_url: ipfsResult.url,
                    block_number: blockchainResult.blockNumber,
                    gas_used: blockchainResult.gasUsed
                }
            };

        } catch (error) {
            console.error('❌ Erro ao emitir certificado:', error);
            throw error;
        }
    }

    /**
     * Verificar certificado pela blockchain
     */
    async verifyCertificate(certificateHash) {
        try {
            // Verificar na blockchain
            const blockchainResult = await blockchainService.verifyCertificate(certificateHash);

            if (!blockchainResult.isValid) {
                return {
                    success: false,
                    message: 'Certificado não encontrado ou inválido na blockchain',
                    isValid: false
                };
            }

            // Buscar dados complementares no banco
            const dbCertificate = await certificateRepository.findCertificateByBlockchainHash(certificateHash);

            return {
                success: true,
                message: 'Certificado verificado com sucesso',
                isValid: blockchainResult.isValid,
                certificate: {
                    blockchain_data: blockchainResult.certificate,
                    database_data: dbCertificate
                }
            };

        } catch (error) {
            console.error('❌ Erro ao verificar certificado:', error);
            throw error;
        }
    }

    /**
     * Obter certificados de um aluno
     */
    async getStudentCertificates(studentId) {
        try {
            // Buscar no banco de dados
            const dbCertificates = await certificateRepository.findCertificates({ student_id: studentId });

            // Buscar na blockchain
            let blockchainCertificates = [];
            try {
                blockchainCertificates = await blockchainService.getStudentCertificates(studentId.toString());
            } catch (error) {
                console.warn('⚠️ Erro ao buscar certificados na blockchain:', error.message);
            }

            return {
                success: true,
                student_id: studentId,
                certificates: {
                    database: dbCertificates,
                    blockchain: blockchainCertificates,
                    total_db: dbCertificates.length,
                    total_blockchain: blockchainCertificates.length
                }
            };

        } catch (error) {
            console.error('❌ Erro ao obter certificados do aluno:', error);
            throw error;
        }
    }

    /**
     * Obter tipos de certificados disponíveis
     */
    async getCertificateTypes() {
        try {
            const types = await certificateRepository.findCertificateTypes();
            return {
                success: true,
                certificate_types: types
            };
        } catch (error) {
            console.error('❌ Erro ao obter tipos de certificados:', error);
            throw error;
        }
    }

    /**
     * Obter estatísticas de certificados
     */
    async getCertificateStats() {
        try {
            const stats = await certificateRepository.getCertificateStats();
            return {
                success: true,
                statistics: {
                    total: parseInt(stats.total_certificates),
                    pending: parseInt(stats.pending_certificates),
                    approved: parseInt(stats.approved_certificates),
                    issued: parseInt(stats.issued_certificates),
                    rejected: parseInt(stats.rejected_certificates),
                    revoked: parseInt(stats.revoked_certificates)
                }
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            throw error;
        }
    }

    /**
     * Validar dados de conquista contra schema
     */
    validateAchievementData(data, schema) {
        try {
            const schemaObj = typeof schema === 'string' ? JSON.parse(schema) : schema;

            // Validação básica - verificar campos obrigatórios
            if (schemaObj.required) {
                for (const field of schemaObj.required) {
                    if (!data[field]) {
                        return {
                            valid: false,
                            errors: [`Campo obrigatório ausente: ${field}`]
                        };
                    }
                }
            }

            return {
                valid: true,
                errors: []
            };

        } catch (error) {
            return {
                valid: false,
                errors: ['Erro ao validar schema de dados']
            };
        }
    }

    /**
     * Buscar aluno por ID
     */
    async getStudentById(studentId) {
        try {
            const query = `
                SELECT 
                    u.id,
                    u.name,
                    u.email,
                    up.roll,
                    up.class_name,
                    up.section_name
                FROM users u
                JOIN user_profiles up ON u.id = up.user_id
                WHERE u.id = $1 AND u.role_id = 3
            `;

            const { processDBRequest } = require('../../utils');
            const { rows } = await processDBRequest({
                query,
                queryParams: [studentId]
            });

            return rows[0];
        } catch (error) {
            console.error('❌ Erro ao buscar aluno:', error);
            throw error;
        }
    }
}

// Exportar a classe e uma instância singleton
module.exports = CertificateService;
module.exports.instance = new CertificateService();