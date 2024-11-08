const db = require('../config/db'); 
const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();

const { JWT_SECRET } = process.env;

// Rota para gerar o link de redefinição
router.post('/generate-reset-link', (req, res) => {
  const { email } = req.body;

 
  db.query('SELECT Id, Email, Username FROM users WHERE Email = ?', [email], (err, rows) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const user = rows[0];

    
    const token = jwt.sign({ id: user.Id, email: user.Email }, JWT_SECRET, { expiresIn: '15m' });

   
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  
    res.status(200).json({ resetLink, username: user.Username });
  });
});

module.exports = router;
