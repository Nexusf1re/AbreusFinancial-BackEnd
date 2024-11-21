const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe'); // O arquivo onde você configurou o Stripe

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // Defina no .env

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error("Erro no webhook:", err.message);
        return res.status(400).send(`Webhook error: ${err.message}`);
    }

    // Lidando com eventos da Stripe
    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        console.log(`Assinatura cancelada: ${subscription.id}`);
        // Atualize o status da assinatura no banco de dados
    }

    res.status(200).send('Evento recebido');
});

module.exports = router;
