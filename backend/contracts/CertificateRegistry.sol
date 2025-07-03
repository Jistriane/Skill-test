// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CertificateRegistry
 * @dev Smart contract para registro e verificação de certificados acadêmicos
 */
contract CertificateRegistry {
    struct Certificate {
        uint256 id;
        address studentWallet;
        string studentId;
        string certificateType;
        string ipfsHash;
        uint256 issuedAt;
        address issuedBy;
        bool isValid;
    }

    mapping(bytes32 => Certificate) public certificates;
    mapping(string => bytes32[]) public studentCertificates;
    
    address public owner;
    uint256 public certificateCounter;

    event CertificateIssued(
        bytes32 indexed certificateHash,
        string indexed studentId,
        string certificateType,
        string ipfsHash,
        uint256 issuedAt
    );

    event CertificateRevoked(
        bytes32 indexed certificateHash,
        string indexed studentId,
        uint256 revokedAt
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Apenas o proprietario pode executar esta funcao");
        _;
    }

    constructor() {
        owner = msg.sender;
        certificateCounter = 0;
    }

    /**
     * @dev Emitir um novo certificado
     * @param _studentWallet Endereço da carteira do aluno
     * @param _studentId ID do aluno no sistema
     * @param _certificateType Tipo do certificado
     * @param _ipfsHash Hash IPFS dos metadados do certificado
     */
    function issueCertificate(
        address _studentWallet,
        string memory _studentId,
        string memory _certificateType,
        string memory _ipfsHash
    ) external onlyOwner returns (bytes32) {
        certificateCounter++;
        
        bytes32 certificateHash = keccak256(
            abi.encodePacked(
                _studentId,
                _certificateType,
                _ipfsHash,
                block.timestamp,
                certificateCounter
            )
        );

        certificates[certificateHash] = Certificate({
            id: certificateCounter,
            studentWallet: _studentWallet,
            studentId: _studentId,
            certificateType: _certificateType,
            ipfsHash: _ipfsHash,
            issuedAt: block.timestamp,
            issuedBy: msg.sender,
            isValid: true
        });

        studentCertificates[_studentId].push(certificateHash);

        emit CertificateIssued(
            certificateHash,
            _studentId,
            _certificateType,
            _ipfsHash,
            block.timestamp
        );

        return certificateHash;
    }

    /**
     * @dev Verificar se um certificado é válido
     * @param _certificateHash Hash do certificado
     */
    function verifyCertificate(bytes32 _certificateHash) 
        external 
        view 
        returns (bool isValid, Certificate memory certificate) 
    {
        Certificate memory cert = certificates[_certificateHash];
        return (cert.isValid && cert.issuedAt > 0, cert);
    }

    /**
     * @dev Obter todos os certificados de um aluno
     * @param _studentId ID do aluno
     */
    function getStudentCertificates(string memory _studentId) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return studentCertificates[_studentId];
    }

    /**
     * @dev Revogar um certificado
     * @param _certificateHash Hash do certificado
     */
    function revokeCertificate(bytes32 _certificateHash) 
        external 
        onlyOwner 
    {
        require(certificates[_certificateHash].issuedAt > 0, "Certificado nao existe");
        require(certificates[_certificateHash].isValid, "Certificado ja foi revogado");
        
        certificates[_certificateHash].isValid = false;
        
        emit CertificateRevoked(
            _certificateHash,
            certificates[_certificateHash].studentId,
            block.timestamp
        );
    }

    /**
     * @dev Transferir propriedade do contrato
     * @param _newOwner Novo proprietário
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Novo proprietario nao pode ser endereco zero");
        owner = _newOwner;
    }

    /**
     * @dev Obter informações do contrato
     */
    function getContractInfo() 
        external 
        view 
        returns (address contractOwner, uint256 totalCertificates) 
    {
        return (owner, certificateCounter);
    }
} 