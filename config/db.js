// db.js

const mysql = require('mysql2'); // Importando mysql2 tradicional
const mysqlPromise = require('mysql2/promise'); // Importando mysql2 com promessas

// Configuração comum do banco de dados
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  connectTimeout: 10000,
};

// Função para escolher entre a versão com promessas ou tradicional
const getDbConnection = (usePromises = false) => {
  if (usePromises) {
    // Retorna a versão de promessas (para usar com async/await)
    return mysqlPromise.createPool(dbConfig);
  } else {
    // Retorna a versão tradicional (baseada em callbacks)
    return mysql.createPool(dbConfig);
  }
};

// Exportando a função de conexão
module.exports = getDbConnection;
