const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');


// Rota para validar o token
router.get('/validate-token', authenticateToken,(req, res) => {
  res.status(200).json({ message: 'Token válido' });
});



module.exports = router;