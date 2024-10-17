const express = require('express');
const pool = require('../config/db');
const localTimestamp = require('../config/timestamp');

const router = express.Router();


//Rota para Listar  as movimentações
router.get("/financial", (req, res) => {

  const usuario = req.query.usuario;  // Obtém o userId da query string
  if (!usuario) {
      return res.status(400).json({ message: "usuario é obrigatório." });
  }

    const query = `SELECT usuario, valor, pgto, tipo, data, categoria, descricao FROM financial WHERE usuario = ?`
    
    pool.query(query, [usuario], (err, results) => {
        if (err) {
          console.error("Erro ao buscar os dados:", err);
          return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
      });

    });


// Rota para inserir dados
router.post("/insert", (req, res) => {
  const { usuario, valor, pgto, tipo, data, categoria, descricao } = req.body; 
  const username = req.user.username;

  const query = `INSERT INTO financial (usuario, valor, pgto, tipo, data, categoria,descricao, Data_Lancamento) VALUES (?, ?, ?, ?, ?, ?, ?, '${localTimestamp}')`;

  pool.query(query, [usuario, valor, pgto, tipo, data, categoria, descricao], (err, results) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.status(500).send("Erro ao inserir os dados");
    }
    res.status(200).send("Dados inseridos com sucesso!");
  });
});


//Rota para Atualizar as movimentações
router.put("/update/:id", (req, res) => {
  const { id } = req.params;
  const { valor, pgto, tipo, data, categoria, descricao } = req.body;
  const query = 'UPDATE financial SET valor = ?, pgto = ?, tipo = ?, data = ?, categoria = ?, descricao = ? WHERE id = ?';
  pool.query(query, [valor, pgto, tipo, data, categoria, descricao, id], (err, results) => {
    if (err) {
      console.error("Erro ao atualizar movimentação:", err);
      return res.status(500).send("Erro ao atualizar movimentação");
    }
    res.status(200).json(results);
  });
});


//Rota para Deletar as movimentações
router.delete("/delete/:id", (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM financial WHERE id = ?';
  pool.query(query, [id], (err, results) => {
    if (err) {
      console.error("Erro ao deletar movimentação:", err);
      return res.status(500).send("Erro ao deletar movimentação");
    }
    res.status(200).json(results);
  });
});



module.exports = router;

