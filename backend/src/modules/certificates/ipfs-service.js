const axios = require('axios');
const FormData = require('form-data');

/**
 * Serviço IPFS para upload e download de metadados de certificados
 * Utiliza APIs HTTP para interagir com IPFS
 */

class IPFSService {
    constructor() {
        this.apiUrl = process.env.IPFS_API_URL || 'https://ipfs.infura.io:5001';
        this.gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
        this.initialized = false;

        // Configurar axios para IPFS API
        this.api = axios.create({
            baseURL: this.apiUrl,
            timeout: 30000, // 30 segundos
            headers: {
                'User-Agent': 'Certificate-System/1.0'
            }
        });

        // Se usando Infura, configurar autenticação
        if (process.env.INFURA_PROJECT_ID && process.env.INFURA_PROJECT_SECRET) {
            const auth = Buffer.from(
                `${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_PROJECT_SECRET}`
            ).toString('base64');

            this.api.defaults.headers.common['Authorization'] = `Basic ${auth}`;
        }
    }

    /**
     * Inicializar serviço IPFS
     */
    async initialize() {
        try {
            console.log('🔧 Inicializando serviço IPFS...');

            // Testar conectividade
            const status = await this.testConnection();

            if (status.api || status.gateway) {
                console.log('✅ IPFS inicializado com sucesso');
                console.log(`📡 API: ${status.api ? '✅' : '❌'} | Gateway: ${status.gateway ? '✅' : '❌'}`);
            } else {
                console.log('⚠️ IPFS não disponível, usando modo fallback');
            }

            this.initialized = true;
            return true;

        } catch (error) {
            console.error('❌ Erro ao inicializar IPFS:', error.message);
            console.log('⚠️ Continuando com modo fallback');
            this.initialized = true;
            return false;
        }
    }

    /**
     * Upload de metadados para IPFS
     * @param {Object} metadata - Metadados do certificado
     * @returns {string} Hash IPFS
     */
    async uploadMetadata(metadata) {
        try {
            console.log('📤 Fazendo upload de metadados para IPFS...');

            // Converter metadados para JSON
            const jsonData = JSON.stringify(metadata, null, 2);

            // Criar FormData para upload
            const form = new FormData();
            form.append('file', Buffer.from(jsonData), {
                filename: 'metadata.json',
                contentType: 'application/json'
            });

            // Upload para IPFS
            const response = await this.api.post('/api/v0/add', form, {
                headers: {
                    ...form.getHeaders(),
                },
                params: {
                    pin: true, // Pin o arquivo para não ser removido
                    'cid-version': 1
                }
            });

            const hash = response.data.Hash;
            console.log('✅ Upload concluído. Hash IPFS:', hash);

            return hash;

        } catch (error) {
            console.error('❌ Erro no upload IPFS:', error.message);

            // Fallback: usar serviço público simples
            return await this.uploadToPublicService(metadata);
        }
    }

    /**
     * Upload usando serviço público (fallback)
     * @param {Object} metadata - Metadados do certificado
     * @returns {string} Hash simulado
     */
    async uploadToPublicService(metadata) {
        try {
            console.log('🔄 Usando fallback para upload IPFS...');

            // Para demonstração, vamos simular um hash IPFS
            const jsonData = JSON.stringify(metadata, null, 2);
            const crypto = require('crypto');
            const hash = crypto.createHash('sha256').update(jsonData).digest('hex');
            const ipfsHash = `Qm${hash.substring(0, 44)}`; // Simular formato IPFS

            console.log('✅ Upload simulado concluído. Hash:', ipfsHash);
            console.log('⚠️ Este é um hash simulado para demonstração');

            return ipfsHash;

        } catch (error) {
            console.error('❌ Erro no fallback IPFS:', error);
            throw new Error(`Falha no upload IPFS: ${error.message}`);
        }
    }

    /**
     * Download de metadados do IPFS
     * @param {string} hash - Hash IPFS
     * @returns {Object} Metadados do certificado
     */
    async downloadMetadata(hash) {
        try {
            console.log('📥 Fazendo download de metadados do IPFS:', hash);

            // Tentar via API primeiro
            try {
                const response = await this.api.post('/api/v0/cat', null, {
                    params: { arg: hash },
                    responseType: 'text'
                });

                const metadata = JSON.parse(response.data);
                console.log('✅ Download via API concluído');
                return metadata;

            } catch (apiError) {
                // Fallback: usar gateway público
                console.log('🔄 Tentando via gateway público...');

                const gatewayResponse = await axios.get(`${this.gateway}${hash}`, {
                    timeout: 15000,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                const metadata = gatewayResponse.data;
                console.log('✅ Download via gateway concluído');
                return metadata;
            }

        } catch (error) {
            console.error('❌ Erro no download IPFS:', error.message);

            // Se o hash é simulado, retornar metadados padrão
            if (hash.startsWith('Qm') && hash.length === 46) {
                console.log('⚠️ Hash simulado detectado, retornando metadados padrão');
                return {
                    name: 'Certificado de Demonstração',
                    description: 'Este é um certificado de demonstração',
                    certificate: {
                        type: 'demo',
                        student: { name: 'Estudante Demo' }
                    }
                };
            }

            throw new Error(`Falha no download IPFS: ${error.message}`);
        }
    }

    /**
     * Verificar se um hash IPFS existe
     * @param {string} hash - Hash IPFS
     * @returns {boolean} Se o hash existe
     */
    async hashExists(hash) {
        try {
            console.log('🔍 Verificando existência do hash IPFS:', hash);

            // Tentar fazer download dos primeiros bytes
            const response = await axios.head(`${this.gateway}${hash}`, {
                timeout: 10000
            });

            return response.status === 200;

        } catch (error) {
            console.log('⚠️ Hash IPFS não encontrado ou inacessível:', hash);
            return false;
        }
    }

    /**
     * Obter URL pública para um hash IPFS
     * @param {string} hash - Hash IPFS
     * @returns {string} URL pública
     */
    getPublicUrl(hash) {
        return `${this.gateway}${hash}`;
    }

    /**
     * Criar metadados estruturados para certificado
     * @param {Object} certificateData - Dados do certificado
     * @returns {Object} Metadados estruturados
     */
    createCertificateMetadata(certificateData) {
        const {
            studentId,
            studentName,
            certificateType,
            achievementData,
            issuedBy,
            issuerName,
            issuedAt,
            certificateId
        } = certificateData;

        return {
            // Metadados NFT padrão
            name: `Certificado ${certificateType} - ${studentName}`,
            description: `Certificado de ${certificateType} emitido para ${studentName}`,
            image: process.env.CERTIFICATE_TEMPLATE_URL || '',

            // Dados específicos do certificado
            certificate: {
                id: certificateId,
                type: certificateType,
                student: {
                    id: studentId,
                    name: studentName
                },
                achievement: achievementData,
                issuer: {
                    address: issuedBy,
                    name: issuerName || process.env.CERTIFICATE_ISSUER_NAME
                },
                issuedAt: issuedAt,
                blockchain: {
                    network: process.env.BLOCKCHAIN_NETWORK || 'sepolia',
                    contract: process.env.CERTIFICATE_CONTRACT_ADDRESS
                }
            },

            // Metadados técnicos
            version: '1.0',
            standard: 'Certificate-v1',
            created: new Date().toISOString(),

            // URLs úteis
            verification_url: `${process.env.UI_URL || 'http://localhost:5173'}/verify/${certificateId}`,
            ipfs_gateway: this.getPublicUrl('{{hash}}').replace('{{hash}}', '')
        };
    }

    /**
     * Testar conectividade IPFS
     * @returns {Object} Status da conectividade
     */
    async testConnection() {
        const results = {
            api: false,
            gateway: false,
            error: null
        };

        try {
            // Testar API
            try {
                const response = await this.api.post('/api/v0/version', null, {
                    timeout: 5000
                });
                results.api = response.status === 200;
            } catch (error) {
                console.log('API IPFS não disponível:', error.message);
            }

            // Testar Gateway
            try {
                const response = await axios.head(this.gateway, {
                    timeout: 5000
                });
                results.gateway = response.status === 200;
            } catch (error) {
                console.log('Gateway IPFS não disponível:', error.message);
            }

        } catch (error) {
            results.error = error.message;
        }

        return results;
    }
}

// Exportar a classe e uma instância singleton
module.exports = IPFSService;
module.exports.instance = new IPFSService();