const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();

// Middlewares para parsing de JSON e permissão de requisições externas (CORS)
app.use(express.json());
app.use(cors());

// Conexão com o arquivo do banco de dados SQLite
const db = new Database('ibsaude.sqlite');

// Garante que a tabela 'remedios' exista com a estrutura correta ao iniciar
db.exec(`
  CREATE TABLE IF NOT EXISTS remedios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    classificacao TEXT,
    codigo TEXT,
    uso TEXT
  )
`);

// ==============================================================================
// 1. CREATE (CRIAR / CADASTRAR)
// Método HTTP: POST
// Rota: http://localhost:3000/remedios
// Postman: Body > raw > JSON
// Exemplo de envio:
// {
//   "nome": "Paracetamol 500mg",
//   "classificacao": "Analgésico",
//   "codigo": "7891234567890",
//   "uso": "Oral"
// }
// ==============================================================================
app.post('/remedios', (req, res) => {
  try {
    const { nome, classificacao, codigo, uso } = req.body;

    // Validação básica para impedir registros sem nome
    if (!nome) {
      return res.status(400).json({ erro: 'O campo "nome" é obrigatório.' });
    }

    // Prepara a consulta SQL e executa a inserção passando os valores em ordem
    const stmt = db.prepare(`
      INSERT INTO remedios (nome, classificacao, codigo, uso)
      VALUES (?, ?, ?, ?)
    `);
    const resultado = stmt.run(nome, classificacao || null, codigo || null, uso || null);

    // Retorna status 201 (Created) e o ID gerado pelo SQLite (lastInsertRowid)
    return res.status(201).json({
      mensagem: 'Remédio cadastrado com sucesso!',
      id: resultado.lastInsertRowid
    });
  } catch (error) {
    console.error('Erro no POST /remedios:', error.message);
    return res.status(500).json({ erro: 'Erro ao cadastrar remédio no banco.' });
  }
});

// ==============================================================================
// 2. READ (LISTAR TODOS)
// Método HTTP: GET
// Rota: http://localhost:3000/remedios
// Postman: Body > none
// ==============================================================================
app.get('/remedios', (req, res) => {
  try {
    // .all() executa o SELECT e retorna um Array com todos os registros encontrados
    const stmt = db.prepare('SELECT * FROM remedios');
    const listaRemedios = stmt.all();

    return res.json({
      total: listaRemedios.length,
      remedios: listaRemedios
    });
  } catch (error) {
    console.error('Erro no GET /remedios:', error.message);
    return res.status(500).json({ erro: 'Erro ao consultar o banco de dados.' });
  }
});

// ==============================================================================
// 3. READ (BUSCAR POR ID ESPECÍFICO)
// Método HTTP: GET
// Rota: http://localhost:3000/remedios/1
// Postman: Body > none
// ==============================================================================
app.get('/remedios/:id', (req, res) => {
  try {
    const { id } = req.params; // Obtém o ID enviado na URL

    // .get() retorna apenas 1 objeto do banco de dados (ou undefined se não existir)
    const stmt = db.prepare('SELECT * FROM remedios WHERE id = ?');
    const remedio = stmt.get(id);

    if (!remedio) {
      return res.status(404).json({ erro: 'Remédio não encontrado.' });
    }

    return res.json(remedio);
  } catch (error) {
    console.error('Erro no GET /remedios/:id:', error.message);
    return res.status(500).json({ erro: 'Erro ao buscar o remédio.' });
  }
});

// ==============================================================================
// 4. UPDATE (ATUALIZAR / EDITAR)
// Método HTTP: PUT
// Rota: http://localhost:3000/remedios/1
// Postman: Body > raw > JSON (envie os novos dados do item)
// ==============================================================================
app.put('/remedios/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { nome, classificacao, codigo, uso } = req.body;

    if (!nome) {
      return res.status(400).json({ erro: 'O campo "nome" é obrigatório para atualização.' });
    }

    const stmt = db.prepare(`
      UPDATE remedios 
      SET nome = ?, classificacao = ?, codigo = ?, uso = ? 
      WHERE id = ?
    `);
    const resultado = stmt.run(nome, classificacao || null, codigo || null, uso || null, id);

    // Se 'changes' for 0, o ID informado não foi encontrado na tabela
    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Remédio não encontrado para atualização.' });
    }

    return res.json({ mensagem: 'Remédio atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro no PUT /remedios/:id:', error.message);
    return res.status(500).json({ erro: 'Erro ao atualizar remédio.' });
  }
});

// ==============================================================================
// 5. DELETE (DELETAR / REMOVER)
// Método HTTP: DELETE
// Rota: http://localhost:3000/remedios/1
// Postman: Body > none
// ==============================================================================
app.delete('/remedios/:id', (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare('DELETE FROM remedios WHERE id = ?');
    const resultado = stmt.run(id);

    // Verifica se alguma linha foi alterada/deletada
    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Remédio não encontrado para remoção.' });
    }

    return res.json({ mensagem: 'Remédio removido com sucesso!' });
  } catch (error) {
    console.error('Erro no DELETE /remedios/:id:', error.message);
    return res.status(500).json({ erro: 'Erro ao deletar remédio.' });
  }
});

// Inicialização da porta do servidor Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});