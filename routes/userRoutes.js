const bcrypt = require('bcryptjs');
const pool = require('../config/db'); // Certificando-se que está importando corretamente o pool de conexões
const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();

const { JWT_SECRET } = process.env;

// Rota para gerar o link de redefinição
router.post('/generate-reset-link', (req, res) => {
  const { email } = req.body;

  pool.query('SELECT Id, Email, Username FROM users WHERE Email = ?', [email], (err, rows) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const user = rows[0];

    const token = jwt.sign({ id: user.Id, email: user.Email }, JWT_SECRET, { expiresIn: '15m' });
    console.log(`Token gerado para o usuário ${user.Username}, expira em: ${new Date(Date.now() + 15 * 60 * 1000).toISOString()}`);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    res.status(200).json({ resetLink, username: user.Username });
  });
});

// Rota para redefinir a senha
router.post('/reset-password', async (req, res) => {
  const { newPassword, token } = req.body;

  if (!newPassword || !token) {
    return res.status(400).json({ message: 'Token e nova senha são obrigatórios' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, email } = decoded;

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    pool.query(
      'UPDATE users SET Password = ? WHERE Id = ? AND Email = ?',
      [hashedPassword, id, email],
      (err, result) => {
        if (err) {
          console.error('Erro ao atualizar a senha:', err);
          return res.status(500).json({ message: 'Erro ao atualizar a senha' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.status(200).json({ message: 'Senha redefinida com sucesso!' });
      }
    );
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(400).json({ message: 'Token expirado, por favor gere um novo link' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ message: 'Token inválido' });
    }
    console.error('Erro ao validar o token:', error);
    return res.status(500).json({ message: 'Erro interno ao validar o token' });
  }
});

module.exports = router;
