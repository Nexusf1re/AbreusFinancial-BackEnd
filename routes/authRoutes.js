const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const localTimestamp = require('../config/timestamp');

const router = express.Router();

// Rota de cadastro de usuário
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Por favor, preencha todos os campos." });
  }

  const checkQuery = 'SELECT * FROM Usuarios WHERE email = ? OR username = ?';
  pool.query(checkQuery, [email, name], async (err, results) => {
    if (err) {
      console.error("Erro ao verificar email e username:", err);
      return res.status(500).json({ message: "Erro ao processar o cadastro." });
    }

    const existingUser = results.find(user => user.email === email || user.username === name);
    if (existingUser) {
      const message = existingUser.email === email ? "Este email já está em uso." : "Este nome já está em uso.";
      return res.status(400).json({ message });
    }

    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const insertQuery = `INSERT INTO Usuarios (username, email, password, dataCadastro) VALUES (?, ?, ?, '${localTimestamp}')`;
      pool.query(insertQuery, [name, email, hashedPassword], (err, result) => {
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
  const { email, password } = req.body;

  // Verificar se o email e a senha foram preenchidos
  if (!email || !password) {
    return res.status(400).json({ message: "Por favor, preencha o email e a senha." });
  }

  // Consulta para buscar o usuário pelo email
  const userQuery = 'SELECT * FROM Usuarios WHERE email = ?';
  pool.query(userQuery, [email], async (err, results) => {
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
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    // Gera um token JWT válido por 10 minutos
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Retorna o token de sucesso
    res.status(200).json({
      message: "Login bem-sucedido!",
      token
    });
  });
});


module.exports = router;
