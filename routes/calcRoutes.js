const express = require('express');
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();


// Rota para buscar lançamentos da Entradas
router.get("/Inflows", authenticateToken, (req, res) => {
  const UserId = req.user.id; 
  console.log("Requisição recebida com UserId:", UserId); 

  if (!UserId) {
      return res.status(400).json({ message: "UserId é obrigatório." });
  }

  const query = `
    SELECT Value, Date, Category
    FROM Inflows 
    WHERE UserId = ?`;
  
  pool.query(query, [UserId], (err, results) => {
      if (err) {
          console.error("Erro ao buscar os dados:", err);
          return res.status(500).send("Erro ao buscar os dados");
      }
      res.status(200).json(results);
  });
});

// Rota para buscar lançamentos da saídas do Debito
router.get("/OutflowsDebit", authenticateToken, (req, res) => {
    const UserId = req.user.id; 
    console.log("Requisição recebida com UserId:", UserId); 
  
    if (!UserId) {
        return res.status(400).json({ message: "UserId é obrigatório." });
    }
  
    const query = `
      SELECT Value, Date, Category
      FROM DebitOutflows 
      WHERE UserId = ?`;
    
    pool.query(query, [UserId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar os dados:", err);
            return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
    });
  });

// Rota para buscar lançamentos de saídas do Crédito
router.get("/OutflowsCredit", authenticateToken, (req, res) => {
    const UserId = req.user.id; 
    console.log("Requisição recebida com UserId:", UserId); 
  
    if (!UserId) {
        return res.status(400).json({ message: "UserId é obrigatório." });
    }
  
    const query = `
      SELECT Value, Date, Category
      FROM CreditOutflows 
      WHERE UserId = ?`;
    
    pool.query(query, [UserId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar os dados:", err);
            return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
    });
  });

  // Rota para buscar lançamentos das Saídas
router.get("/Outflows", authenticateToken, (req, res) => {
    const UserId = req.user.id; 
    console.log("Requisição recebida com UserId:", UserId); 
  
    if (!UserId) {
        return res.status(400).json({ message: "UserId é obrigatório." });
    }
  
    const query = `
      SELECT Value, Date, Category
      FROM Outflows 
      WHERE UserId = ?`;
    
    pool.query(query, [UserId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar os dados:", err);
            return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
    });
  });



module.exports = router;