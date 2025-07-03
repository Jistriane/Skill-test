const express = require("express");
const {
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
} = require("./certificate-controller");

const { authenticateToken } = require("../../middlewares/authenticate-token");
const { checkApiAccess } = require("../../middlewares/check-api-access");

const router = express.Router();

// Rota pública para verificação de certificados
router.get("/verify/:hash", handleVerifyCertificate);

// Aplicar autenticação para todas as rotas abaixo
router.use(authenticateToken);

// Rotas de tipos de certificados
router.get("/types", checkApiAccess, handleGetCertificateTypes);

// Rotas de estatísticas (apenas admin)
router.get("/stats", checkApiAccess, handleGetCertificateStats);

// Rotas de certificados pendentes (apenas admin)
router.get("/pending", checkApiAccess, handleGetPendingCertificates);

// Rota para aprovação em lote (apenas admin)
router.post("/batch-approve", checkApiAccess, handleBatchApproveCertificates);

// Rotas para certificados de estudantes específicos
router.get("/student/:studentId", checkApiAccess, handleGetStudentCertificates);

// Rotas principais de certificados
router.route("/")
    .get(checkApiAccess, handleListCertificates)
    .post(checkApiAccess, handleCreateCertificateRequest);

// Rota para criar solicitação de certificado
router.post("/request", checkApiAccess, handleCreateCertificateRequest);

// Rotas para operações específicas de certificados
router.get("/:id", checkApiAccess, handleGetCertificate);
router.put("/:id/approve", checkApiAccess, handleApproveCertificate);
router.put("/:id/reject", checkApiAccess, handleRejectCertificate);
router.post("/:id/issue", checkApiAccess, handleIssueCertificate);

module.exports = router;