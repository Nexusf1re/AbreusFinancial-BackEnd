const express = require('express');
const db= require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const verifySubscription = require('../middleware/subscriptionMiddleware');
const router = express.Router();

const pool = db(false);


// Rota para buscar lançamentos da Entradas
router.get("/Inflows", authenticateToken, verifySubscription, (req, res) => {
    const UserId = req.user.id;

    if (!UserId) {
        return res.status(400).json({ message: "UserId é obrigatório." });
    }

    const query = `
        SELECT Id, Value, Category, Type, PaymentMethod, DATE_FORMAT(Date, '%Y-%m-%d') AS Date
        FROM Inflows 
        WHERE UserId = ?`;

    pool.query(query, [UserId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar os dados:", err);
            return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
    });
});

// Rota para buscar lançamentos das saídas do Débito
router.get("/OutflowsDebit", authenticateToken, verifySubscription, (req, res) => {
    const UserId = req.user.id;

    if (!UserId) {
        return res.status(400).json({ message: "UserId é obrigatório." });
    }

    const query = `
        SELECT Id, Value, Category, Type, PaymentMethod, DATE_FORMAT(Date, '%Y-%m-%d') AS Date
        FROM DebitOutflows 
        WHERE UserId = ?`;

    pool.query(query, [UserId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar os dados:", err);
            return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
    });
});

// Rota para buscar lançamentos de saídas do Crédito
router.get("/OutflowsCredit", authenticateToken, verifySubscription, (req, res) => {
    const UserId = req.user.id;

    if (!UserId) {
        return res.status(400).json({ message: "UserId é obrigatório." });
    }

    const query = `
        SELECT Id, Value, Category, Type, PaymentMethod, DATE_FORMAT(Date, '%Y-%m-%d') AS Date
        FROM CreditOutflows 
        WHERE UserId = ?`;

    pool.query(query, [UserId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar os dados:", err);
            return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
    });
});

// Rota para buscar lançamentos das Saídas
router.get("/Outflows", authenticateToken, verifySubscription, (req, res) => {
    const UserId = req.user.id;

    if (!UserId) {
        return res.status(400).json({ message: "UserId é obrigatório." });
    }

    const query = `
        SELECT Id, Value, Category, Type, PaymentMethod, DATE_FORMAT(Date, '%Y-%m-%d') AS Date
        FROM Outflows 
        WHERE UserId = ?`;

    pool.query(query, [UserId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar os dados:", err);
            return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
    });
});

module.exports = router;
