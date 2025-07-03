const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cookieParser = require("cookie-parser");
const { handle404Error, handleGlobalError, } = require("./middlewares");
const { v1Routes } = require("./routes/v1");
const { corsPolicy } = require("./config/cors");
const path = require("path");

const app = express();

// Inicializar serviços blockchain (não bloquear a inicialização da app)
const initializeBlockchainServices = async() => {
    try {
        const CertificateService = require("./modules/certificates/certificate-service");
        const certificateService = CertificateService.instance;
        await certificateService.initialize();
        console.log("🔗 Serviços blockchain inicializados com sucesso");
    } catch (error) {
        console.warn("⚠️ Aviso: Serviços blockchain não puderam ser inicializados:", error.message);
        console.warn("⚠️ O sistema funcionará normalmente, mas funcionalidades blockchain estarão indisponíveis");
    }
};

// Inicializar serviços de forma assíncrona
initializeBlockchainServices();

app.use(corsPolicy);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(cookieParser());

app.use("/api/v1", v1Routes);

app.use(handle404Error);
app.use(handleGlobalError);

module.exports = { app };