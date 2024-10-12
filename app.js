const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());

app.get('/', (request, response) => {
    response.send("Get recebido, parabens Gabribri")
});

app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`)
})