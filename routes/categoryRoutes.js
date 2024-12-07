const express = require('express');
const db= require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const { verifySubscription } = require('../middleware/subscriptionMiddleware');
const router = express.Router();

const pool = db(false);


// Rota para listar as categorias
router.get("/list", authenticateToken, verifySubscription, (req, res) => { 
    const UserId = req.user.id; 

    if (!UserId) {
        return res.status(400).json({ message: "UserId é obrigatório." });
    }

    const query = 'SELECT Id, Category, Type FROM categories WHERE UserId = ?';

    pool.query(query, [UserId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar os dados:", err);
            return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
    });
});

// Rota para cadastrar as categorias
router.post("/register", authenticateToken, verifySubscription, (req, res) => { 
    const UserId = req.user.id; 
    const { Category, Type } = req.body;

    if (!UserId || !Category || !Type) {
        return res.status(400).json({ message: "UserId, Category e Type são obrigatórios." });
    }

    const query = 'INSERT INTO categories (UserId, Category, Type) VALUES (?, ?, ?)';
    pool.query(query, [UserId, Category, Type], (err, results) => {
        if (err) {
            console.error("Erro ao cadastrar categoria:", err);
            return res.status(500).send("Erro ao cadastrar categoria");
        }
        res.status(200).json(results);
    });
});

// Rota para atualizar as categorias
router.put("/update/:Id", authenticateToken, verifySubscription, (req, res) => { 
    const { Id } = req.params;
    const { Category, Type } = req.body;
    const query = 'UPDATE categories SET Category = ?, Type = ? WHERE Id = ? AND UserId = ?';
    const UserId = req.user.id; 

    pool.query(query, [Category, Type, Id, UserId], (err, results) => { 
        if (err) {
            console.error("Erro ao atualizar categoria:", err);
            return res.status(500).send("Erro ao atualizar categoria");
        }
        res.status(200).json(results);
    });
});


// Rota para excluir as categorias
router.delete("/delete/:Id", authenticateToken, verifySubscription, (req, res) => { 
    const { Id } = req.params;
    const UserId = req.user.id; 

    if (!UserId) {
        return res.status(400).send("UserId é obrigatório!");
    }

    const query = "DELETE FROM categories WHERE Id = ? AND UserId = ?";
    pool.query(query, [Id, UserId], (err, results) => {
        if (err) {
            console.error("Erro ao excluir a categoria:", err);
            return res.status(500).send("Erro ao excluir categoria");
        }

        res.status(200).json({ message: "Categoria excluída com sucesso" });
    });
});

module.exports = router;
