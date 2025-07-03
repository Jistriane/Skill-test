# Sistema de Gestão Escolar - Backend

Backend para sistema de gestão escolar com funcionalidades de certificados blockchain.

## 🚀 Funcionalidades

### Sistema Principal
- Autenticação e autorização
- Gestão de usuários (alunos, professores, funcionários)
- Controle de acesso baseado em roles
- Notificações e avisos
- Dashboard administrativo

### 🔗 Sistema de Certificados Blockchain (NOVO!)
- **Emissão de certificados na blockchain Ethereum (Sepolia)**
- **Verificação de autenticidade descentralizada**
- **Armazenamento de metadados em IPFS**
- **Sistema de aprovação em duas etapas**
- **Auditoria completa de transações**

## 📋 Pré-requisitos

- Node.js 16+
- PostgreSQL 12+
- npm ou yarn
- **Carteira Ethereum com ETH Sepolia (para certificados)**
- **Acesso à rede Sepolia**

## 🛠️ Instalação

1. Clone o repositório
```bash
git clone <repository-url>
cd skill-test/backend
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
```bash
cp .env-example .env
# Edite o arquivo .env com suas configurações
```

4. Configure o banco de dados
```bash
# Execute o schema principal
psql -d sua_database -f ../seed_db/tables.sql

# Execute o schema de certificados
psql -d sua_database -f database/certificates-schema-fixed.sql

# Dados iniciais (opcional)
psql -d sua_database -f ../seed_db/seed-db.sql
```

## ⚙️ Configuração

### Variáveis de Ambiente Principais

```env
# Servidor
PORT=3001
NODE_ENV=development

# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/database_name

# JWT
JWT_ACCESS_TOKEN_SECRET=your_secret_here
JWT_REFRESH_TOKEN_SECRET=your_refresh_secret_here

# Email
RESEND_API_KEY=your_resend_api_key
```

### 🔗 Configuração Blockchain (Certificados)

```env
# Blockchain
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
BLOCKCHAIN_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
CERTIFICATE_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS

# IPFS
IPFS_GATEWAY=https://ipfs.io/ipfs/
IPFS_API_URL=https://ipfs.infura.io:5001

# Configurações de certificados
CERTIFICATE_ISSUER_NAME=Sua Instituição
CERTIFICATE_TEMPLATE_URL=https://yoursite.com/certificate-template
```

## 🚀 Executar

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

### Deploy do Smart Contract
```bash
node scripts/deploy-contract.js
```

## 📊 API Endpoints

### Autenticação
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh-token` - Renovar token

### 🎓 Certificados Blockchain
- `POST /api/v1/certificates/request` - Solicitar certificado
- `GET /api/v1/certificates` - Listar certificados
- `GET /api/v1/certificates/:id` - Obter certificado
- `POST /api/v1/certificates/:id/approve` - Aprovar certificado
- `POST /api/v1/certificates/:id/reject` - Rejeitar certificado
- `POST /api/v1/certificates/:id/issue` - Emitir na blockchain
- `GET /api/v1/certificates/verify/:hash` - Verificar certificado
- `GET /api/v1/certificates/student/:studentId` - Certificados do aluno
- `POST /api/v1/certificates/revoke/:hash` - Revogar certificado
- `GET /api/v1/certificates/stats` - Estatísticas
- `POST /api/v1/certificates/batch-approve` - Aprovação em lote

### Outros Endpoints
- `GET /api/v1/dashboard` - Dashboard
- `GET /api/v1/students` - Gestão de alunos
- `GET /api/v1/staffs` - Gestão de funcionários
- `GET /api/v1/classes` - Gestão de turmas
- `GET /api/v1/departments` - Gestão de departamentos

## 🏗️ Arquitetura

### Estrutura de Pastas
```
src/
├── modules/
│   ├── certificates/          # 🆕 Sistema de certificados
│   │   ├── blockchain-service.js
│   │   ├── ipfs-service.js
│   │   ├── certificate-service.js
│   │   ├── certificate-controller.js
│   │   ├── certificate-repository.js
│   │   └── certificate-router.js
│   ├── auth/                  # Autenticação
│   ├── students/              # Gestão de alunos
│   └── ...
├── config/                    # Configurações
├── middlewares/               # Middlewares
├── utils/                     # Utilitários
└── routes/                    # Rotas principais
```

### 🔗 Arquitetura Blockchain

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Blockchain    │
│                 │    │                 │    │                 │
│ • Conectar      │◄──►│ • Validação     │◄──►│ • Smart Contract│
│   Carteira      │    │ • Aprovação     │    │ • Sepolia       │
│ • Assinar       │    │ • IPFS Upload   │    │ • Verificação   │
│   Transações    │    │ • Auditoria     │    │ • Eventos       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │      IPFS       │
                       │                 │
                       │ • Metadados     │
                       │ • Templates     │
                       │ • Imagens       │
                       └─────────────────┘
```

## 🎓 Fluxo de Certificados

1. **Solicitação**: Admin cria solicitação de certificado
2. **Validação**: Sistema valida dados do aluno e conquista
3. **Aprovação**: Super-admin aprova/rejeita com comentários
4. **Upload IPFS**: Metadados são enviados para IPFS
5. **Blockchain**: Transação é enviada para Ethereum
6. **Confirmação**: Certificado é confirmado na blockchain
7. **Verificação**: Qualquer pessoa pode verificar autenticidade

## 🔒 Segurança

### Autenticação
- JWT tokens com refresh
- CSRF protection
- Rate limiting
- CORS configurado

### 🔗 Blockchain
- Chaves privadas em variáveis de ambiente
- Validação de transações
- Controle de acesso por roles
- Auditoria de todas as operações

## 🧪 Testes

```bash
# Executar testes
npm test

# Testes com coverage
npm run test:coverage

# Testar conexão blockchain
node scripts/test-blockchain.js
```

## 📝 Logs

Os logs são salvos em:
- Console (desenvolvimento)
- Arquivo `logs/app.log` (produção)
- Eventos blockchain são auditados no banco

## 🚀 Deploy

### Preparação
1. Configure todas as variáveis de ambiente
2. Execute migrations do banco
3. Faça deploy do smart contract
4. Configure IPFS

### Produção
```bash
# Build
npm run build

# Start
npm start
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 🆘 Suporte

Para suporte, entre em contato:
- Email: support@school-mgmt.com
- Issues: GitHub Issues

---

## 🎯 Próximas Funcionalidades

- [ ] Interface Web3 no frontend
- [ ] Suporte a múltiplas redes
- [ ] NFTs para certificados especiais
- [ ] Integração com carteiras móveis
- [ ] API pública de verificação
- [ ] Dashboard de analytics blockchain
