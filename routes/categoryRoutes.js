const express = require('express');
const pool = require('../config/db');

const router = express.Router();

//Rota para listar as categorias
router.get("/list", (req, res) => {

    const userId = req.query.userId;
    if(!userId) {
         return res.status(400).json({ message: "userId é obrigatório." });
    }

    const query = 'SELECT * FROM category WHERE userId = ?';


    pool.query(query,[userId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar os dados:", err);
            return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
    });

});


//Rota para cadastrar as categorias
router.post("/register", (req, res) => {
    const { userId, category, type } = req.body;

    if (!userId || !category || !type) {
        return res.status(400).json({ message: "userId, category e type são obrigatórios." });
    }

    const query = 'INSERT INTO category (userId, category, type) VALUES (?, ?, ?)';
    pool.query(query, [userId, category, type], (err, results) => {
        if (err) {
            console.error("Erro ao cadastrar categoria:", err);
            return res.status(500).send("Erro ao cadastrar categoria");
        }
        res.status(200).json(results);
    });

});


//Rota para excluir as categorias
router.delete("/delete/:id", (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM category WHERE id = ?';
    pool.query(query, [id], (err, results) => {
      if (err) {
        console.error("Erro ao excluir categoria:", err);
        return res.status(500).send("Erro ao excluir categoria");
      }
      res.status(200).json(results);
    });
  });




module.exports = router;