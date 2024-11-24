const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const getLocalTimestamp = require('../config/timestamp');

const pool = db(false); 

const router = express.Router();

// Rota para gerar o link de redefinição de senha
router.post("/generate-reset-link", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "O Email é obrigatório." });
  }

  // Verificar se o email existe
  const checkEmailQuery = 'SELECT Id, Email, Username FROM users WHERE Email = ?';
  pool.query(checkEmailQuery, [email], (err, results) => {
    if (err) {
      console.error("Erro ao verificar email:", err);
      return res.status(500).json({ message: "Erro ao processar a solicitação." });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const user = results[0];

    // Gerar o token de redefinição de senha
    const token = jwt.sign(
      { id: user.Id, email: user.Email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    console.log(`Token gerado para o usuário ${user.Username}, expira em: ${new Date(Date.now() + 15 * 60 * 1000).toISOString()}`);
    
    res.status(200).json({ resetLink, username: user.Username });
  });
});



// Rota para redefinir a senha
router.post("/reset-password", async (req, res) => {
  const { newPassword, token } = req.body;

  if (!newPassword || !token) {
    return res.status(400).json({ message: "Token e nova senha são obrigatórios" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, email } = decoded;

    const saltRounds = 10; 
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar a senha do usuário no banco
    const updatePasswordQuery = 'UPDATE users SET Password = ? WHERE Id = ? AND Email = ?';
    pool.query(updatePasswordQuery, [hashedPassword, id, email], (err, result) => {
      if (err) {
        console.error("Erro ao atualizar a senha:", err);
        return res.status(500).json({ message: "Erro ao atualizar a senha." });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }

      res.status(200).json({ message: "Senha redefinida com sucesso!" });
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(400).json({ message: "Token expirado, por favor gere um novo link." });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ message: "Token inválido." });
    }
    console.error("Erro ao validar o token:", error);
    return res.status(500).json({ message: "Erro interno ao validar o token." });
  }
});

module.exports = router;
