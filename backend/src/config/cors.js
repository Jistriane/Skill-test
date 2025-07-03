const cors = require("cors");
const { env } = require("./env");

const corsPolicy = cors({
    origin: function(origin, callback) {
        // Permitir origens específicas
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174'
        ];

        // Permitir requisições sem origem (como apps mobile ou Postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Origin", "X-CSRF-TOKEN"],
    credentials: true,
});

module.exports = { corsPolicy };