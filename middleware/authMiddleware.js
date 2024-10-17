const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
    }

    const token = authHeader.split(' ')[1]; // Extrai o token após "Bearer"

    if (!token) {
        return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Token inválido ou expirado." });
        }

        req.user = user;
        next(); //Executa a proxima rota após a validação do token for bem sucedida!
    });
};


module.exports = authenticateToken;
