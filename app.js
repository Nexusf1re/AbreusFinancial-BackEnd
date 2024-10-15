const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());


const authRoutes =require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transactionsRoutes = require('./routes/transactionsRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

app.use('/auth', authRoutes);
app.use('/userRoutes', userRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/category', categoryRoutes);



app.get('/', (request, response) => {
    response.send("Hello World")
});

app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`)
})