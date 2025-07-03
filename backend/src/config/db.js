const { Pool } = require("pg");
const { env } = require("./env");

const db = new Pool({
    host: env.DB_HOST || 'localhost',
    port: env.DB_PORT || 5432,
    database: env.DB_NAME || 'school_mgmt',
    user: env.DB_USER || 'jistriane',
    password: env.DB_PASSWORD || 'dev123'
});

module.exports = { db };