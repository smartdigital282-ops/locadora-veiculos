-- =============================================
-- BANCO DE DADOS: LOCADORA DE VEÍCULOS
-- =============================================

CREATE DATABASE IF NOT EXISTS locadora_veiculos;
USE locadora_veiculos;

-- Tabela de Usuários
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    tipo ENUM('cliente', 'admin') DEFAULT 'cliente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Veículos
CREATE TABLE veiculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    ano INT NOT NULL,
    placa VARCHAR(10) NOT NULL UNIQUE,
    cor VARCHAR(30) NOT NULL,
    valor_diaria DECIMAL(10,2) NOT NULL,
    disponivel BOOLEAN DEFAULT TRUE,
    imagem_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Locações
CREATE TABLE locacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    veiculo_id INT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    status ENUM('ativa', 'finalizada', 'cancelada') DEFAULT 'ativa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
);

-- =============================================
-- DADOS INICIAIS
-- =============================================

-- Usuário admin (senha: admin123)
INSERT INTO usuarios (nome, email, senha, tipo) VALUES 
('Administrador', 'admin@locadora.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjQQezzhOi0Bk.3xL.kX/3xL.kX/3x', 'admin');

-- Veículos de exemplo
INSERT INTO veiculos (marca, modelo, ano, placa, cor, valor_diaria, imagem_url) VALUES 
('Toyota', 'Corolla', 2024, 'ABC-1234', 'Prata', 180.00, 'https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=400'),
('Honda', 'Civic', 2023, 'DEF-5678', 'Preto', 200.00, 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=400'),
('Volkswagen', 'Golf', 2023, 'GHI-9012', 'Branco', 170.00, 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=400'),
('Chevrolet', 'Onix', 2024, 'JKL-3456', 'Vermelho', 120.00, 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400'),
('Hyundai', 'HB20', 2023, 'MNO-7890', 'Azul', 110.00, 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400'),
('Fiat', 'Pulse', 2024, 'PQR-1122', 'Cinza', 150.00, 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=400');
