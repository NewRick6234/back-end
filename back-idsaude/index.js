const Database = require('better-sqlite3'); 
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());




// Substitua pelo nome ou caminho do seu arquivo .db existente
const db = new Database('ibsaude.sqlite');

// Exemplo: Consultar dados de uma tabela que já existe no seu banco
const stmt = db.prepare('SELECT * FROM remedios');
const resultados = stmt.all();
console.log(resultados);

const ANVISA_API_URL = 'https://consultas.anvisa.gov.br/api/consulta/medicamento/produtos';

const headersANVISA = {
  'Authorization': 'Guest',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Host': 'consultas.anvisa.gov.br',
  'Referer': 'https://consultas.anvisa.gov.br/docs/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
};

app.get('/api/medicamentos/buscar', async (req, res) => {
  try {
    const { nome } = req.query;

    if (!nome) {
      return res.status(400).json({ error: 'O parâmetro "nome" é obrigatório na URL.' });
    }

    const response = await axios.get(ANVISA_API_URL, {
      params: {
        count: 15,
        'filter[nomeProduto]': nome,
        page: 1
      },
      headers: headersANVISA,
      timeout: 10000
    });

    const itens = response.data.content || [];

    // Mapeamento correto utilizando a estrutura real retornada pela ANVISA
    const resultadoFormatado = itens.map(item => {
      const prod = item.produto || {};
      const emp = item.empresa || {};
      const proc = item.processo || {};

      // Junta o nome genérico/substância com o nome comercial (complemento), se existir
      const nomeBase = prod.nome || 'N/A';
      const nomeComercial = prod.complemento ? ` (${prod.complemento})` : '';
      const nomeCompleto = `${nomeBase}${nomeComercial}`;

      return {
        // CÓDIGOS DE REGISTRO E PROCESSO
        codigoRegistro: prod.numeroRegistroFormatado || prod.numeroRegistro || 'N/A',
        numeroProcesso: proc.numeroProcessoFormatado || proc.numero || 'N/A',

        // INFORMAÇÕES DO MEDICAMENTO
        nomeProduto: nomeCompleto,
        principioAtivo: prod.principioAtivo && prod.principioAtivo.trim() !== '' ? prod.principioAtivo : 'Não informado',
        
        // TIPO E SITUAÇÃO REGULATÓRIA
        tipo: prod.categoriaRegulatoria?.descricao || 'N/A',
        situacao: prod.situacaoApresentacao || 'Não informado',
        dataVencimentoRegistro: prod.mesAnoVencimentoFormatado || 'N/A',

        // DADOS DO FABRICANTE
        empresa: emp.razaoSocial || 'Não informada',
        cnpjEmpresa: emp.cnpjFormatado || emp.cnpj || 'N/A'
      };
    });

    return res.json({
      total: response.data.totalElements || resultadoFormatado.length,
      medicamentos: resultadoFormatado
    });

  } catch (error) {
    console.error('Erro ao consultar ANVISA:', error.message);
    return res.status(500).json({ 
      error: 'Erro ao buscar medicamento na ANVISA.',
      detalhes: error.message 
    });
  }
});

app.post('/cadastrar', (req, res) => {
    try {
        // Extrai todos os campos enviados pelo cliente
        const { nome, classificacao, codigo, uso } = req.body;

        // Validação básica dos campos obrigatórios
        if (!nome || !codigo) {
            return res.status(400).json({ 
                erro: 'Os campos "nome" e "codigo" são obrigatórios.' 
            });
        }

        // Query SQL incluindo todas as colunas da sua tabela
        const inserir = db.prepare(`
            INSERT INTO remedios (nome, classificacao, codigo, uso) 
            VALUES (?, ?, ?, ?)
        `);

        // Executa a inserção passando os valores na mesma ordem da query
        const resultado = inserir.run(nome, classificacao || null, codigo, uso || null);

        console.log(`Registro inserido com ID: ${resultado.lastInsertRowid}`);

        return res.status(201).json({
            mensagem: 'Remédio cadastrado com sucesso!',
            id: resultado.lastInsertRowid
        });

    } catch (error) {
        console.error('Erro ao cadastrar no banco:', error.message);
        return res.status(500).json({
            erro: 'Falha ao salvar no banco de dados.',
            detalhes: error.message
        });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});