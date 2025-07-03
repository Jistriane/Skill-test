const { processDBRequest } = require("../../utils");

/**
 * Repository para operações de certificados no banco de dados
 */
class CertificateRepository {

    /**
     * Criar uma nova solicitação de certificado
     */
    async createCertificateRequest(certificateData) {
        const query = `
            INSERT INTO certificates (
                student_id, 
                certificate_type_id, 
                achievement_data, 
                created_by, 
                status
            ) VALUES ($1, $2, $3, $4, $5) 
            RETURNING *
        `;
        const queryParams = [
            certificateData.student_id,
            certificateData.certificate_type_id,
            JSON.stringify(certificateData.achievement_data),
            certificateData.created_by,
            'pending'
        ];

        const { rows } = await processDBRequest({ query, queryParams });
        return rows[0];
    }

    /**
     * Buscar todos os certificados com filtros
     */
    async findCertificates(filters = {}) {
        let query = `
            SELECT 
                c.id,
                c.student_id,
                u.name as student_name,
                u.email as student_email,
                ct.name as certificate_type_name,
                ct.description as certificate_type_description,
                c.achievement_data,
                c.blockchain_hash,
                c.ipfs_hash,
                c.status,
                c.created_by,
                creator.name as created_by_name,
                c.approved_by,
                approver.name as approved_by_name,
                c.created_at,
                c.approved_at,
                c.issued_at,
                c.blockchain_tx_hash,
                c.metadata
            FROM certificates c
            JOIN users u ON c.student_id = u.id
            JOIN certificate_types ct ON c.certificate_type_id = ct.id
            JOIN users creator ON c.created_by = creator.id
            LEFT JOIN users approver ON c.approved_by = approver.id
            WHERE 1=1
        `;

        const queryParams = [];
        let paramIndex = 1;

        if (filters.student_id) {
            query += ` AND c.student_id = $${paramIndex}`;
            queryParams.push(filters.student_id);
            paramIndex++;
        }

        if (filters.status) {
            query += ` AND c.status = $${paramIndex}`;
            queryParams.push(filters.status);
            paramIndex++;
        }

        if (filters.certificate_type_id) {
            query += ` AND c.certificate_type_id = $${paramIndex}`;
            queryParams.push(filters.certificate_type_id);
            paramIndex++;
        }

        if (filters.created_by) {
            query += ` AND c.created_by = $${paramIndex}`;
            queryParams.push(filters.created_by);
            paramIndex++;
        }

        query += ' ORDER BY c.created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex}`;
            queryParams.push(filters.limit);
            paramIndex++;
        }

        if (filters.offset) {
            query += ` OFFSET $${paramIndex}`;
            queryParams.push(filters.offset);
            paramIndex++;
        }

        const { rows } = await processDBRequest({ query, queryParams });
        return rows;
    }

    /**
     * Buscar certificado por ID
     */
    async findCertificateById(certificateId) {
        const query = `
            SELECT 
                c.*,
                u.name as student_name,
                u.email as student_email,
                up.roll as student_roll,
                up.class_name,
                up.section_name,
                ct.name as certificate_type_name,
                ct.description as certificate_type_description,
                ct.achievement_schema,
                creator.name as created_by_name,
                approver.name as approved_by_name
            FROM certificates c
            JOIN users u ON c.student_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
            JOIN certificate_types ct ON c.certificate_type_id = ct.id
            JOIN users creator ON c.created_by = creator.id
            LEFT JOIN users approver ON c.approved_by = approver.id
            WHERE c.id = $1
        `;

        const { rows } = await processDBRequest({ query, queryParams: [certificateId] });
        return rows[0];
    }

    /**
     * Buscar certificado por hash da blockchain
     */
    async findCertificateByBlockchainHash(blockchainHash) {
        const query = `
            SELECT 
                c.*,
                u.name as student_name,
                u.email as student_email,
                ct.name as certificate_type_name
            FROM certificates c
            JOIN users u ON c.student_id = u.id
            JOIN certificate_types ct ON c.certificate_type_id = ct.id
            WHERE c.blockchain_hash = $1
        `;

        const { rows } = await processDBRequest({ query, queryParams: [blockchainHash] });
        return rows[0];
    }

    /**
     * Atualizar status do certificado
     */
    async updateCertificateStatus(certificateId, status, userId, additionalData = {}) {
        let query = `
            UPDATE certificates 
            SET status = $1, metadata = metadata || $2
        `;
        let queryParams = [status, JSON.stringify(additionalData)];
        let paramIndex = 3;

        if (status === 'approved') {
            query += `, approved_by = $${paramIndex}, approved_at = CURRENT_TIMESTAMP`;
            queryParams.push(userId);
            paramIndex++;
        }

        if (status === 'issued') {
            query += `, issued_at = CURRENT_TIMESTAMP`;
            if (additionalData.blockchain_hash) {
                query += `, blockchain_hash = $${paramIndex}`;
                queryParams.push(additionalData.blockchain_hash);
                paramIndex++;
            }
            if (additionalData.blockchain_tx_hash) {
                query += `, blockchain_tx_hash = $${paramIndex}`;
                queryParams.push(additionalData.blockchain_tx_hash);
                paramIndex++;
            }
            if (additionalData.ipfs_hash) {
                query += `, ipfs_hash = $${paramIndex}`;
                queryParams.push(additionalData.ipfs_hash);
                paramIndex++;
            }
        }

        query += ` WHERE id = $${paramIndex} RETURNING *`;
        queryParams.push(certificateId);

        const { rows } = await processDBRequest({ query, queryParams });
        return rows[0];
    }

    /**
     * Buscar todos os tipos de certificados
     */
    async findCertificateTypes() {
        const query = `
            SELECT * FROM certificate_types 
            WHERE is_active = true 
            ORDER BY name
        `;
        const { rows } = await processDBRequest({ query });
        return rows;
    }

    /**
     * Buscar tipo de certificado por ID
     */
    async findCertificateTypeById(typeId) {
        const query = `
            SELECT * FROM certificate_types 
            WHERE id = $1 AND is_active = true
        `;
        const { rows } = await processDBRequest({ query, queryParams: [typeId] });
        return rows[0];
    }

    /**
     * Criar registro de aprovação
     */
    async createApprovalRecord(certificateId, approverId, status, comments = null) {
        const query = `
            INSERT INTO certificate_approvals (
                certificate_id, 
                approver_id, 
                status, 
                comments
            ) VALUES ($1, $2, $3, $4) 
            RETURNING *
        `;
        const queryParams = [certificateId, approverId, status, comments];

        const { rows } = await processDBRequest({ query, queryParams });
        return rows[0];
    }

    /**
     * Buscar histórico de aprovações de um certificado
     */
    async findApprovalHistory(certificateId) {
        const query = `
            SELECT 
                ca.*,
                u.name as approver_name,
                u.email as approver_email
            FROM certificate_approvals ca
            JOIN users u ON ca.approver_id = u.id
            WHERE ca.certificate_id = $1
            ORDER BY ca.created_at DESC
        `;

        const { rows } = await processDBRequest({ query, queryParams: [certificateId] });
        return rows;
    }

    /**
     * Registrar transação blockchain
     */
    async createBlockchainTransaction(transactionData) {
        const query = `
            INSERT INTO blockchain_transactions (
                certificate_id,
                transaction_hash,
                transaction_type,
                gas_used,
                gas_price,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const queryParams = [
            transactionData.certificate_id,
            transactionData.transaction_hash,
            transactionData.transaction_type,
            transactionData.gas_used,
            transactionData.gas_price,
            transactionData.status || 'pending'
        ];

        const { rows } = await processDBRequest({ query, queryParams });
        return rows[0];
    }

    /**
     * Atualizar transação blockchain
     */
    async updateBlockchainTransaction(transactionHash, updateData) {
        const query = `
            UPDATE blockchain_transactions 
            SET 
                status = $1,
                block_number = $2,
                block_hash = $3,
                confirmed_at = CURRENT_TIMESTAMP
            WHERE transaction_hash = $4
            RETURNING *
        `;
        const queryParams = [
            updateData.status,
            updateData.block_number,
            updateData.block_hash,
            transactionHash
        ];

        const { rows } = await processDBRequest({ query, queryParams });
        return rows[0];
    }

    /**
     * Buscar configuração blockchain ativa
     */
    async getActiveBlockchainConfig() {
        const query = `
            SELECT * FROM blockchain_config 
            WHERE is_active = true 
            LIMIT 1
        `;
        const { rows } = await processDBRequest({ query });
        return rows[0];
    }

    /**
     * Estatísticas de certificados
     */
    async getCertificateStats() {
        const query = `
            SELECT 
                COUNT(*) as total_certificates,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_certificates,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_certificates,
                COUNT(CASE WHEN status = 'issued' THEN 1 END) as issued_certificates,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_certificates,
                COUNT(CASE WHEN status = 'revoked' THEN 1 END) as revoked_certificates
            FROM certificates
        `;
        const { rows } = await processDBRequest({ query });
        return rows[0];
    }
}

module.exports = new CertificateRepository();