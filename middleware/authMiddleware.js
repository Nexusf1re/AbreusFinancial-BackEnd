const jwt = require('jsonwebtoken');
const stripe = require('../config/stripe');

const SECRET_KEY = process.env.JWT_SECRET;

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
    }

    jwt.verify(token, SECRET_KEY, async (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Token inválido ou expirado." });
        }

        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
