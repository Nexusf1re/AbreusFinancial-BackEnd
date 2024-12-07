const express = require('express');
const db= require('../config/db');
const getLocalTimestamp = require('../config/timestamp');
const authenticateToken = require('../middleware/authMiddleware');
const { verifySubscription } = require('../middleware/subscriptionMiddleware');
const router = express.Router();

const pool = db(false);


router.get("/financial", authenticateToken, verifySubscription, (req, res) => {
  const UserId = req.user.id; 

  if (!UserId) {
      return res.status(400).json({ message: "UserId é obrigatório." });
  }

  const query = `
    SELECT Id, Username, Value, PaymentMethod, Type, Date, Category, Description 
    FROM transactions 
    WHERE UserId = ?`;
  
  pool.query(query, [UserId], (err, results) => {
      if (err) {
          console.error("Erro ao buscar os dados:", err);
          return res.status(500).send("Erro ao buscar os dados");
      }
      res.status(200).json(results);
  });
});

// Rota para inserir as movimentações
router.post("/insert", authenticateToken, verifySubscription, (req, res) => {
  const { Value, PaymentMethod, Type, Date: dateString, Category, Description } = req.body;

  if (!dateString) {
    return res.status(400).json({ error: "Data ausente." });
  }

  const formattedDate = new Date(dateString);
  if (isNaN(formattedDate)) {
    return res.status(400).json({ error: "Data inválida." });
  }

  const UserId = req.user.id;
  const Username = req.user.username;

  const localTimestamp = getLocalTimestamp();

  const query = `INSERT INTO transactions (UserId, Username, Value, PaymentMethod, Type, Date, Category, Description, EntryDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  pool.query(query, [UserId, Username, Value, PaymentMethod, Type, formattedDate.toISOString().slice(0, 19).replace('T', ' '), Category, Description, localTimestamp], (err, results) => {
    if (err) {
      console.error("Erro ao inserir os dados:", err.message);
      return res.status(500).json({ error: "Erro ao inserir os dados" });
    }
    res.status(200).json({ message: "Dados inseridos com sucesso!" });
  });
});

// Rota para Atualizar as movimentações
router.put("/update/:Id", authenticateToken, verifySubscription, (req, res) => { 
  const { Id } = req.params;
  const UserId = req.user.id; 
  const { Value, PaymentMethod, Type, Date, Category, Description } = req.body;

  if (!UserId) {
    return res.status(400).send("UserId é obrigatório!");
  }

  const query = 'UPDATE transactions SET Value = ?, PaymentMethod = ?, Type = ?, Date = ?, Category = ?, Description = ? WHERE Id = ? AND UserId = ?';
  
  pool.query(query, [Value, PaymentMethod, Type, Date, Category, Description, Id, UserId], (err, results) => {
    if (err) {
      console.error("Erro ao atualizar movimentação:", err);
      return res.status(500).send("Erro ao atualizar movimentação");
    }
    res.status(200).json(results);
  });
});

// Rota para Deletar as movimentações
router.delete("/delete/:Id", authenticateToken, verifySubscription, (req, res) => { 
  const { Id } = req.params;
  const UserId = req.user.id; 

  if (!UserId) {
    return res.status(400).send("UserId é obrigatório!");
  }

  const query = 'DELETE FROM transactions WHERE Id = ? AND UserId = ?';
  
  pool.query(query, [Id, UserId], (err, results) => {
    if (err) {
      console.error("Erro ao deletar movimentação:", err);
      return res.status(500).send("Erro ao deletar movimentação");
    }
    res.status(200).json({ message: "Movimentação deletada com sucesso" });
  });
});

module.exports = router;
