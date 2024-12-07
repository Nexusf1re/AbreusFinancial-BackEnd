// Rota de autenticação
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const getLocalTimestamp = require('../config/timestamp');

const pool = db(false);

const router = express.Router();


// Rota de cadastro de usuário
router.post("/register", async (req, res) => {
  const { Username, Email, Password } = req.body;

  const localTimestamp = getLocalTimestamp();

  if (!Username || !Email || !Password) {
    return res.status(400).json({ message: "Por favor, preencha todos os campos." });
  }

  // Verificar se o email já está em uso
  const checkEmailQuery = 'SELECT * FROM users WHERE Email = ?';
  pool.query(checkEmailQuery, [Email], async (err, results) => {
    if (err) {
      console.error("Erro ao verificar Email:", err);
      return res.status(500).json({ message: "Erro ao processar o cadastro." });
    }

    
    if (results.length > 0) {
      return res.status(400).json({ message: "Este Email já está em uso." });
    }

    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(Password, saltRounds);

      // Inserir o novo usuário na tabela
      const insertQuery = `INSERT INTO users (Username, Email, Password, SignupDate) VALUES (?, ?, ?, '${localTimestamp}')`;
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

  if (!Email || !Password) {
    return res.status(400).json({ message: "Por favor, preencha o Email e a senha." });
  }

  const userQuery = "SELECT * FROM users WHERE Email = ?";
  pool.query(userQuery, [Email], async (err, results) => {
    if (err) {
      console.error("Erro ao verificar usuário:", err);
      return res.status(500).json({ message: "Erro ao processar o login." });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "Email não encontrado." });
    }

    const user = results[0];
    

    const passwordMatch = await bcrypt.compare(Password, user.Password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    const token = jwt.sign(
      {
        id: user.Id,
        email: user.Email, 
        username: user.Username 
      },
      process.env.JWT_SECRET,
    );

    res.status(200).json({
      message: "Login bem-sucedido!",
      token,
      username: user.Username
    });
  });
});

module.exports = router;
