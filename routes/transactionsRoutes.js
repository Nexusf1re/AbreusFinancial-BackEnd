const express = require('express');
const pool = require('../config/db');
const localTimestamp = require('../config/timestamp');

const router = express.Router();


//Rota para Listar  as movimentações
router.get("/financial", (req, res) => {

  const Username = req.query.Username;  // Obtém o userId da query string
  if (!Username) {
      return res.status(400).json({ message: "username é obrigatório." });
  }

    const query = `SELECT Username, Value, PaymentMethod, Type, Date, Category, Description FROM transactions WHERE Username = ?`
    
    pool.query(query, [Username], (err, results) => {
        if (err) {
          console.error("Erro ao buscar os dados:", err);
          return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
      });

    });


// Rota para inserir dados
router.post("/insert", (req, res) => {
  const { Value, PaymentMethod, Type, Date, Category, Description } = req.body; 
  const Username = req.user.username;
  const { UserId } = req.body;

  const query = `INSERT INTO transactions (UserId, Username, Value, PaymentMethod, Type, Date, Category, Description, Data_Lancamento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '${localTimestamp}')`;

  pool.query(query, [UserId, Username, Value, PaymentMethod, Type, Date, Category, Description], (err, results) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.status(500).send("Erro ao inserir os dados");
    }
    res.status(200).send("Dados inserIdos com sucesso!");
  });
});


//Rota para Atualizar as movimentações
router.put("/update/:Id", (req, res) => {
  const { Id } = req.params;
  const { UserId } = req.body;
  const { Value, PaymentMethod, Type, Date, Category, Description } = req.body;
  const query = 'UPDATE transactions SET Value = ?, PaymentMethod = ?, Type = ?, Date = ?, Category = ?, Description = ? WHERE Id = ? AND UserId = ?';
  pool.query(query, [Value, PaymentMethod, Type, Date, Category, Description, Id, UserId], (err, results) => {
    if (err) {
      console.error("Erro ao atualizar movimentação:", err);
      return res.status(500).send("Erro ao atualizar movimentação");
    }
    res.status(200).json(results);
  });
});


//Rota para Deletar as movimentações
router.delete("/delete/:Id", (req, res) => {
  const { Id } = req.params;
  const { UserId } = req.body;
  const query = 'DELETE FROM transactions WHERE Id = ? AND UserId = ?';
  pool.query(query, [Id, UserId], (err, results) => {
    if (err) {
      console.error("Erro ao deletar movimentação:", err);
      return res.status(500).send("Erro ao deletar movimentação");
    }
    res.status(200).json(results);
  });
});



module.exports = router;

