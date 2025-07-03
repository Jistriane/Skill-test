-- Schema para Sistema de Certificados Blockchain
-- Criado para integração com o sistema escolar existente

-- Tabela principal de certificados
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    certificate_type_id INTEGER NOT NULL REFERENCES certificate_types(id),
    achievement_data JSONB NOT NULL,
    blockchain_hash VARCHAR(66) UNIQUE,
    ipfs_hash VARCHAR(64),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'issued', 'revoked')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    issued_at TIMESTAMP,
    blockchain_tx_hash VARCHAR(66),
    gas_used INTEGER,
    gas_price BIGINT,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT valid_approval CHECK (
        (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
        (status != 'approved')
    ),
    CONSTRAINT valid_issuance CHECK (
        (status = 'issued' AND blockchain_hash IS NOT NULL AND issued_at IS NOT NULL) OR
        (status != 'issued')
    )
);

-- Tipos de certificados disponíveis
CREATE TABLE IF NOT EXISTS certificate_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    template_ipfs_hash VARCHAR(64),
    achievement_schema JSONB NOT NULL, -- Schema JSON para validar dados de conquista
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Histórico de aprovações de certificados
CREATE TABLE IF NOT EXISTS certificate_approvals (
    id SERIAL PRIMARY KEY,
    certificate_id INTEGER NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
    approver_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configurações blockchain
CREATE TABLE IF NOT EXISTS blockchain_config (
    id SERIAL PRIMARY KEY,
    network_name VARCHAR(50) NOT NULL UNIQUE,
    rpc_url VARCHAR(255) NOT NULL,
    contract_address VARCHAR(42),
    private_key_encrypted TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transações blockchain para auditoria
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id SERIAL PRIMARY KEY,
    certificate_id INTEGER REFERENCES certificates(id) ON DELETE SET NULL,
    transaction_hash VARCHAR(66) NOT NULL UNIQUE,
    transaction_type VARCHAR(50) NOT NULL, -- 'issue', 'revoke', 'verify'
    gas_used INTEGER,
    gas_price BIGINT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    block_number BIGINT,
    block_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_blockchain_hash ON certificates(blockchain_hash);
CREATE INDEX IF NOT EXISTS idx_certificates_created_at ON certificates(created_at);
CREATE INDEX IF NOT EXISTS idx_certificate_approvals_certificate_id ON certificate_approvals(certificate_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_certificate_id ON blockchain_transactions(certificate_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_hash ON blockchain_transactions(transaction_hash);

-- Triggers para atualização automática de timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_certificate_types_updated_at 
    BEFORE UPDATE ON certificate_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blockchain_config_updated_at 
    BEFORE UPDATE ON blockchain_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir tipos de certificados padrão
INSERT INTO certificate_types (name, description, achievement_schema) VALUES 
('conclusao_curso', 'Certificado de Conclusão de Curso', '{
    "type": "object",
    "required": ["course_name", "completion_date", "grade"],
    "properties": {
        "course_name": {"type": "string"},
        "completion_date": {"type": "string", "format": "date"},
        "grade": {"type": "number", "minimum": 0, "maximum": 10},
        "credits": {"type": "number", "minimum": 0}
    }
}'),
('melhor_aluno', 'Certificado de Melhor Aluno', '{
    "type": "object", 
    "required": ["period", "average_grade", "ranking"],
    "properties": {
        "period": {"type": "string"},
        "average_grade": {"type": "number", "minimum": 0, "maximum": 10},
        "ranking": {"type": "integer", "minimum": 1},
        "total_students": {"type": "integer", "minimum": 1}
    }
}'),
('participacao_evento', 'Certificado de Participação em Evento', '{
    "type": "object",
    "required": ["event_name", "event_date", "participation_type"],
    "properties": {
        "event_name": {"type": "string"},
        "event_date": {"type": "string", "format": "date"},
        "participation_type": {"type": "string", "enum": ["participant", "organizer", "speaker"]},
        "hours": {"type": "number", "minimum": 0}
    }
}'),
('frequencia_exemplar', 'Certificado de Frequência Exemplar', '{
    "type": "object",
    "required": ["period", "attendance_rate"],
    "properties": {
        "period": {"type": "string"},
        "attendance_rate": {"type": "number", "minimum": 0, "maximum": 100},
        "total_days": {"type": "integer", "minimum": 1},
        "present_days": {"type": "integer", "minimum": 0}
    }
}')
ON CONFLICT (name) DO NOTHING;

-- Inserir configuração padrão da blockchain (Sepolia)
INSERT INTO blockchain_config (network_name, rpc_url, is_active) VALUES 
('sepolia', 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID', true)
ON CONFLICT (network_name) DO NOTHING;

-- Adicionar permissões de acesso para certificados no sistema existente
INSERT INTO access_controls (name, path, method, type, hierarchy_id) VALUES 
('Certificados - Listar', '/certificates', 'GET', 'endpoint', 100),
('Certificados - Criar Solicitação', '/certificates/request', 'POST', 'endpoint', 101),
('Certificados - Aprovar', '/certificates/approve', 'PUT', 'endpoint', 102),
('Certificados - Emitir', '/certificates/issue', 'POST', 'endpoint', 103),
('Certificados - Verificar', '/certificates/verify', 'GET', 'endpoint', 104),
('Certificados - Revogar', '/certificates/revoke', 'PUT', 'endpoint', 105),
('Certificados - Gerenciar Tipos', '/certificate-types', 'GET', 'endpoint', 106),
('Certificados - Blockchain Config', '/blockchain/config', 'GET', 'endpoint', 107)
ON CONFLICT (path, method) DO NOTHING;

-- Comentários para documentação
COMMENT ON TABLE certificates IS 'Tabela principal para armazenar certificados e seu status no fluxo de aprovação';
COMMENT ON TABLE certificate_types IS 'Tipos de certificados disponíveis com schemas de validação';
COMMENT ON TABLE certificate_approvals IS 'Histórico de aprovações e rejeições de certificados';
COMMENT ON TABLE blockchain_config IS 'Configurações de rede blockchain e contratos';
COMMENT ON TABLE blockchain_transactions IS 'Auditoria de todas as transações blockchain realizadas';

COMMENT ON COLUMN certificates.achievement_data IS 'Dados JSON da conquista do aluno (notas, datas, etc.)';
COMMENT ON COLUMN certificates.blockchain_hash IS 'Hash único do certificado na blockchain';
COMMENT ON COLUMN certificates.ipfs_hash IS 'Hash IPFS dos metadados do certificado';
COMMENT ON COLUMN certificate_types.achievement_schema IS 'Schema JSON para validar dados de conquista';
COMMENT ON COLUMN blockchain_config.private_key_encrypted IS 'Chave privada criptografada para assinatura de transações'; 