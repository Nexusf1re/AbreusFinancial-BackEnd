const express = require('express');
const router = express.Router();
//const authenticateToken = require('../middleware/authMiddleware');

// Rota para validar o token
router.get('/validate-token', (req, res) => {
  // Se o token for válido, responde com status 200
  res.status(200).json({ message: 'Token válido' });
});

module.exports = router;