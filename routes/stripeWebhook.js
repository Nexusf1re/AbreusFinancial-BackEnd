const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log("Evento construído com sucesso:", event);
  } catch (err) {
    console.error("Erro ao validar webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'invoice.payment_succeeded':
      console.log(`Fatura pagamento sucesso: ${event.data.object.id}`);
      break;
    case 'invoice.payment_failed':
      console.log(`Fatura pagamento falhado: ${event.data.object.id}`);
      break;
    case 'customer.created':
      console.log(`Novo cliente criado: ${event.data.object.id}`);
      break;
    case 'customer.subscription.created':
      console.log(`Nova assinatura criada: ${event.data.object.id}`);
      break;
    case 'customer.subscription.updated':
      console.log(`Assinatura atualizada: ${event.data.object.id}`);
      break;
    case 'customer.subscription.deleted':
      console.log(`Assinatura cancelada: ${event.data.object.id}`);
      break;
    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  res.status(200).send();
});

module.exports = router;
