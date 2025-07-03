const asyncHandler = require("express-async-handler");
const certificateService = require('./certificate-service');
const ApiError = require('../../utils/api-error');

/**
 * Controller para endpoints de certificados
 */

/**
 * @desc    Criar solicitação de certificado
 * @route   POST /api/v1/certificates/request
 * @access  Private (Admin)
 */
const handleCreateCertificateRequest = asyncHandler(async(req, res) => {
    const { student_id, certificate_type_id, achievement_data } = req.body;
    const userId = req.user.id;

    if (!student_id || !certificate_type_id || !achievement_data) {
        throw new ApiError('Dados obrigatórios ausentes', 400);
    }

    const result = await certificateService.createCertificateRequest({
        student_id,
        certificate_type_id,
        achievement_data
    }, userId);

    res.status(201).json(result);
});

/**
 * @desc    Listar certificados
 * @route   GET /api/v1/certificates
 * @access  Private
 */
const handleListCertificates = asyncHandler(async(req, res) => {
    const { status, student_id, certificate_type_id, limit, offset } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role_id;

    const filters = {};
    if (status) filters.status = status;
    if (student_id) filters.student_id = parseInt(student_id);
    if (certificate_type_id) filters.certificate_type_id = parseInt(certificate_type_id);
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const result = await certificateService.listCertificates(filters, userId, userRole);
    res.json(result);
});

/**
 * @desc    Obter detalhes de um certificado
 * @route   GET /api/v1/certificates/:id
 * @access  Private
 */
const handleGetCertificate = asyncHandler(async(req, res) => {
    const { id } = req.params;

    // Buscar certificado no repository diretamente para detalhes completos
    const certificateRepository = require('./certificate-repository');
    const certificate = await certificateRepository.findCertificateById(parseInt(id));

    if (!certificate) {
        throw new ApiError('Certificado não encontrado', 404);
    }

    // Buscar histórico de aprovações
    const approvalHistory = await certificateRepository.findApprovalHistory(parseInt(id));

    res.json({
        success: true,
        certificate: {
            ...certificate,
            approval_history: approvalHistory
        }
    });
});

/**
 * @desc    Aprovar certificado
 * @route   PUT /api/v1/certificates/:id/approve
 * @access  Private (Admin only)
 */
const handleApproveCertificate = asyncHandler(async(req, res) => {
    const { id } = req.params;
    const { comments } = req.body;
    const approverId = req.user.id;

    // Verificar se é admin
    if (req.user.role_id !== 1) {
        throw new ApiError('Apenas administradores podem aprovar certificados', 403);
    }

    const result = await certificateService.approveCertificate(
        parseInt(id),
        approverId,
        comments
    );

    res.json(result);
});

/**
 * @desc    Rejeitar certificado
 * @route   PUT /api/v1/certificates/:id/reject
 * @access  Private (Admin only)
 */
const handleRejectCertificate = asyncHandler(async(req, res) => {
    const { id } = req.params;
    const { comments } = req.body;
    const approverId = req.user.id;

    // Verificar se é admin
    if (req.user.role_id !== 1) {
        throw new ApiError('Apenas administradores podem rejeitar certificados', 403);
    }

    if (!comments) {
        throw new ApiError('Comentários são obrigatórios para rejeição', 400);
    }

    const result = await certificateService.rejectCertificate(
        parseInt(id),
        approverId,
        comments
    );

    res.json(result);
});

/**
 * @desc    Emitir certificado na blockchain
 * @route   POST /api/v1/certificates/:id/issue
 * @access  Private (Admin only)
 */
const handleIssueCertificate = asyncHandler(async(req, res) => {
    const { id } = req.params;
    const { student_wallet_address } = req.body;

    // Verificar se é admin
    if (req.user.role_id !== 1) {
        throw new ApiError('Apenas administradores podem emitir certificados', 403);
    }

    const result = await certificateService.issueCertificate(
        parseInt(id),
        student_wallet_address
    );

    res.json(result);
});

/**
 * @desc    Verificar certificado por hash da blockchain
 * @route   GET /api/v1/certificates/verify/:hash
 * @access  Public
 */
const handleVerifyCertificate = asyncHandler(async(req, res) => {
    const { hash } = req.params;

    if (!hash || hash.length !== 66) {
        throw new ApiError('Hash do certificado inválido', 400);
    }

    const result = await certificateService.verifyCertificate(hash);
    res.json(result);
});

/**
 * @desc    Obter certificados de um aluno
 * @route   GET /api/v1/certificates/student/:studentId
 * @access  Private
 */
const handleGetStudentCertificates = asyncHandler(async(req, res) => {
    const { studentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_id;

    // Se não for admin, verificar se está consultando próprios certificados
    if (userRole !== 1 && parseInt(studentId) !== userId) {
        throw new ApiError('Acesso negado', 403);
    }

    const result = await certificateService.getStudentCertificates(parseInt(studentId));
    res.json(result);
});

/**
 * @desc    Obter tipos de certificados disponíveis
 * @route   GET /api/v1/certificate-types
 * @access  Private
 */
const handleGetCertificateTypes = asyncHandler(async(req, res) => {
    const result = await certificateService.getCertificateTypes();
    res.json(result);
});

/**
 * @desc    Obter estatísticas de certificados
 * @route   GET /api/v1/certificates/stats
 * @access  Private (Admin only)
 */
const handleGetCertificateStats = asyncHandler(async(req, res) => {
    // Verificar se é admin
    if (req.user.role_id !== 1) {
        throw new ApiError('Apenas administradores podem ver estatísticas', 403);
    }

    const result = await certificateService.getCertificateStats();
    res.json(result);
});

/**
 * @desc    Obter certificados pendentes de aprovação
 * @route   GET /api/v1/certificates/pending
 * @access  Private (Admin only)
 */
const handleGetPendingCertificates = asyncHandler(async(req, res) => {
    // Verificar se é admin
    if (req.user.role_id !== 1) {
        throw new ApiError('Apenas administradores podem ver certificados pendentes', 403);
    }

    const userId = req.user.id;
    const userRole = req.user.role_id;

    const result = await certificateService.listCertificates({ status: 'pending' },
        userId,
        userRole
    );

    res.json(result);
});

/**
 * @desc    Processar aprovação em lote
 * @route   POST /api/v1/certificates/batch-approve
 * @access  Private (Admin only)
 */
const handleBatchApproveCertificates = asyncHandler(async(req, res) => {
    const { certificate_ids, comments } = req.body;
    const approverId = req.user.id;

    // Verificar se é admin
    if (req.user.role_id !== 1) {
        throw new ApiError('Apenas administradores podem aprovar certificados', 403);
    }

    if (!certificate_ids || !Array.isArray(certificate_ids) || certificate_ids.length === 0) {
        throw new ApiError('Lista de IDs de certificados é obrigatória', 400);
    }

    const results = [];
    const errors = [];

    for (const certificateId of certificate_ids) {
        try {
            const result = await certificateService.approveCertificate(
                parseInt(certificateId),
                approverId,
                comments
            );
            results.push({
                certificate_id: certificateId,
                success: true,
                message: result.message
            });
        } catch (error) {
            errors.push({
                certificate_id: certificateId,
                success: false,
                error: error.message
            });
        }
    }

    res.json({
        success: true,
        message: `Processamento concluído: ${results.length} aprovados, ${errors.length} erros`,
        results: results,
        errors: errors
    });
});

module.exports = {
    handleCreateCertificateRequest,
    handleListCertificates,
    handleGetCertificate,
    handleApproveCertificate,
    handleRejectCertificate,
    handleIssueCertificate,
    handleVerifyCertificate,
    handleGetStudentCertificates,
    handleGetCertificateTypes,
    handleGetCertificateStats,
    handleGetPendingCertificates,
    handleBatchApproveCertificates
};