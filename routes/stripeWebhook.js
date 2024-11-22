const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error("Erro no webhook:", err.message);
        return res.status(400).send(`Webhook error: ${err.message}`);
    }

    // Log para verificar o tipo de evento recebido
    console.log(`Evento recebido: ${event.type}`);

    // Lidando com eventos específicos
    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        console.log(`Assinatura cancelada: ${subscription.id}`);
        // Atualize o status da assinatura no banco de dados
    }

    res.status(200).send('Evento recebido');
});


module.exports = router;
