const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Configuração do Banco de Dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'locadora_veiculos',
  waitForConnections: true,
  connectionLimit: 10
};

const pool = mysql.createPool(dbConfig);

// Chave secreta para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'locadora_secret_key_2024';

// Middleware de autenticação
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// ==================== ROTAS DE AUTENTICAÇÃO ====================

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }
    
    const user = users[0];
    const senhaValida = await bcrypt.compare(senha, user.senha);
    
    if (!senhaValida) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, tipo: user.tipo },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Registrar usuário
app.post('/api/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    const senhaHash = await bcrypt.hash(senha, 10);
    
    const [result] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
      [nome, email, senhaHash, 'cliente']
    );
    
    res.status(201).json({ message: 'Usuário criado com sucesso', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ==================== ROTAS DE VEÍCULOS ====================

// Listar todos os veículos
app.get('/api/veiculos', async (req, res) => {
  try {
    const [veiculos] = await pool.query('SELECT * FROM veiculos ORDER BY id DESC');
    res.json(veiculos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar veículos' });
  }
});

// Buscar veículo por ID
app.get('/api/veiculos/:id', async (req, res) => {
  try {
    const [veiculos] = await pool.query('SELECT * FROM veiculos WHERE id = ?', [req.params.id]);
    if (veiculos.length === 0) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }
    res.json(veiculos[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar veículo' });
  }
});

// Criar veículo (admin)
app.post('/api/veiculos', authMiddleware, async (req, res) => {
  try {
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { marca, modelo, ano, placa, cor, valor_diaria, imagem_url } = req.body;
    const [result] = await pool.query(
      'INSERT INTO veiculos (marca, modelo, ano, placa, cor, valor_diaria, imagem_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [marca, modelo, ano, placa, cor, valor_diaria, imagem_url]
    );
    
    res.status(201).json({ message: 'Veículo criado', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar veículo' });
  }
});

// Atualizar veículo (admin)
app.put('/api/veiculos/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { marca, modelo, ano, placa, cor, valor_diaria, disponivel, imagem_url } = req.body;
    await pool.query(
      'UPDATE veiculos SET marca=?, modelo=?, ano=?, placa=?, cor=?, valor_diaria=?, disponivel=?, imagem_url=? WHERE id=?',
      [marca, modelo, ano, placa, cor, valor_diaria, disponivel, imagem_url, req.params.id]
    );
    
    res.json({ message: 'Veículo atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar veículo' });
  }
});

// Deletar veículo (admin)
app.delete('/api/veiculos/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    await pool.query('DELETE FROM veiculos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Veículo deletado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar veículo' });
  }
});

// ==================== ROTAS DE LOCAÇÕES ====================

// Listar locações do usuário
app.get('/api/locacoes', authMiddleware, async (req, res) => {
  try {
    let query = `
      SELECT l.*, v.marca, v.modelo, v.placa 
      FROM locacoes l 
      JOIN veiculos v ON l.veiculo_id = v.id
    `;
    
    if (req.user.tipo !== 'admin') {
      query += ' WHERE l.usuario_id = ?';
      const [locacoes] = await pool.query(query, [req.user.id]);
      return res.json(locacoes);
    }
    
    query += ' ORDER BY l.id DESC';
    const [locacoes] = await pool.query(query);
    res.json(locacoes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar locações' });
  }
});

// Criar locação
app.post('/api/locacoes', authMiddleware, async (req, res) => {
  try {
    const { veiculo_id, data_inicio, data_fim } = req.body;
    
    // Verificar disponibilidade
    const [veiculo] = await pool.query('SELECT * FROM veiculos WHERE id = ? AND disponivel = true', [veiculo_id]);
    if (veiculo.length === 0) {
      return res.status(400).json({ error: 'Veículo não disponível' });
    }
    
    // Calcular valor total
    const inicio = new Date(data_inicio);
    const fim = new Date(data_fim);
    const dias = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
    const valor_total = dias * veiculo[0].valor_diaria;
    
    // Criar locação
    const [result] = await pool.query(
      'INSERT INTO locacoes (usuario_id, veiculo_id, data_inicio, data_fim, valor_total) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, veiculo_id, data_inicio, data_fim, valor_total]
    );
    
    // Marcar veículo como indisponível
    await pool.query('UPDATE veiculos SET disponivel = false WHERE id = ?', [veiculo_id]);
    
    res.status(201).json({ message: 'Locação criada', id: result.insertId, valor_total });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar locação' });
  }
});

// Finalizar locação
app.put('/api/locacoes/:id/finalizar', authMiddleware, async (req, res) => {
  try {
    const [locacao] = await pool.query('SELECT * FROM locacoes WHERE id = ?', [req.params.id]);
    
    if (locacao.length === 0) {
      return res.status(404).json({ error: 'Locação não encontrada' });
    }
    
    await pool.query('UPDATE locacoes SET status = ? WHERE id = ?', ['finalizada', req.params.id]);
    await pool.query('UPDATE veiculos SET disponivel = true WHERE id = ?', [locacao[0].veiculo_id]);
    
    res.json({ message: 'Locação finalizada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao finalizar locação' });
  }
});

// ==================== ROTA DE TESTE ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API Locadora de Veículos funcionando!' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
