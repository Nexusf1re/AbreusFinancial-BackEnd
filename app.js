const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const app = express();
const PORT = 3000;

// Middleware global
app.use(cors());

// Definido express.raw() para o webhook do Stripe antes de express.json()
app.use('/stripe-webhook', express.raw({ type: 'application/json' }));

// Middleware express.json() para as demais rotas
app.use(express.json()); 

// Importando rotas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transactionsRoutes = require('./routes/transactionsRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const calcRoutes = require('./routes/calcRoutes');
const stripeWebhook = require('./routes/stripeWebhook');
const stripeRoutes = require('./routes/stripeRoutes');

// Aplicando middlewares e rotas
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/category', categoryRoutes);
app.use('/calc', calcRoutes);
app.use('/stripe', stripeRoutes);

// Aplique express.raw() somente para o webhook do Stripe
app.use('/stripe-webhook', stripeWebhook);

app.get('/', (request, response) => {
    response.send("Hello World");
});

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'favicon.ico'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});