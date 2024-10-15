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
router.post("/form", (req, res) => {
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

module.exports = router;

