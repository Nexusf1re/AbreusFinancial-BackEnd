const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());



const transactionsRoutes = require('./routes/transactionsRoutes');


app.use('/transactions', transactionsRoutes);



app.get('/', (request, response) => {
    response.send("Hello World")
});

app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`)
})