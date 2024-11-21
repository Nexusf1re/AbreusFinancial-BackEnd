const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = 3000;
const stripeWebhook = require('./routes/stripeWebhook');

const allowedOrigin = process.env.FRONTEND_URL;

app.use(cors());

app.use(express.json());

app.use('/stripe', stripeWebhook);


const authRoutes =require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transactionsRoutes = require('./routes/transactionsRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const calcRoutes = require('./routes/calcRoutes');


app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/category', categoryRoutes);
app.use('/calc', calcRoutes);


app.get('/', (request, response) => {
    response.send("Hello World")
});


app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`)
});