const express = require('express');
const pool = require('../config/db');
const localTimestamp = require('../config/timestamp');

const router = express.Router();

const user = '"TESTE"'

router.get("/financial", (req, res) => {
    const query = `SELECT id, usuario, valor, pgto, tipo, data, categoria, subcategoria, descricao FROM financial WHERE usuario = ${user}`
    
    pool.query(query, (err, results) => {
        if (err) {
          console.error("Erro ao buscar os dados:", err);
          return res.status(500).send("Erro ao buscar os dados");
        }
        res.status(200).json(results);
      });
    });

    module.exports = router;''