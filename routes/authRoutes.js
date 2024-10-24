const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const localTimestamp = require('../config/timestamp');

const router = express.Router();


// Rota de cadastro de usuário
router.post("/register", async (req, res) => {
  const { Username, Email, Password } = req.body;

  if (!Username || !Email || !Password) {
    return res.status(400).json({ message: "Por favor, preencha todos os campos." });
  }

  const checkQuery = 'SELECT * FROM users WHERE Email = ? OR Username = ?';
  pool.query(checkQuery, [Email, Username], async (err, results) => {
    if (err) {
      console.error("Erro ao verificar Email e Username:", err);
      return res.status(500).json({ message: "Erro ao processar o cadastro." });
    }

    const existingUser = results.find(user => user.Email === Email || user.Username === name);
    if (existingUser) {
      const message = existingUser.Email === Email ? "Este Email já está em uso." : "Este nome já está em uso.";
      return res.status(400).json({ message });
    }

    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(Password, saltRounds);
      const insertQuery = `INSERT INTO Usuarios (Username, Email, Password, dataCadastro) VALUES (?, ?, ?, '${localTimestamp}')`;
      pool.query(insertQuery, [Username, Email, hashedPassword], (err, result) => {
        if (err) {
          console.error("Erro ao inserir usuário:", err);
          return res.status(500).json({ message: "Erro ao cadastrar o usuário." });
        }
        res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
      });
    } catch (error) {
      console.error("Erro ao gerar o hash da senha:", error);
      res.status(500).json({ message: "Erro interno no servidor." });
    }
  });
});


// Rota de login
router.post("/login", async (req, res) => {
  const { Email, Password } = req.body;

  // Verificar se o Email e a senha foram preenchidos
  if (!Email || !Password) {
    return res.status(400).json({ message: "Por favor, preencha o Email e a senha." });
  }

  // Consulta para buscar o usuário pelo Email
  const userQuery = 'SELECT * FROM users WHERE Email = ?';
  pool.query(userQuery, [Email], async (err, results) => {
    if (err) {
      console.error("Erro ao verificar usuário:", err);
      return res.status(500).json({ message: "Erro ao processar o login." });
    }

    // Verifica se o Email foi encontrado
    if (results.length === 0) {
      return res.status(400).json({ message: "Email não encontrado." });
    }

    const user = results[0];

    // Verifica se a senha fornecida corresponde à senha armazenada
    const passwordMatch = await bcrypt.compare(Password, user.Password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    // Gera um token JWT válido por 10 minutos
    const token = jwt.sign(
      { id: user.id, Email: user.Email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Retorna o token de sucesso
    res.status(200).json({
      message: "Login bem-sucedido!",
      token
    });
  });
});


module.exports = router;
