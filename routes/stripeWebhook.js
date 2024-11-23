const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Defina o middleware express.raw() diretamente na rota do webhook
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  console.log("### Nova requisição recebida no /webhook");
  console.log("Cabeçalhos:", req.headers);
  console.log("Corpo (raw):", req.body.toString()); // Corpo no formato raw (não parseado)

  let event;

  try {
    // Certifique-se de que o corpo raw está sendo passado corretamente
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log("Evento construído com sucesso:", event);
  } catch (err) {
    console.error("Erro ao validar webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'customer.created':
      console.log(`Novo cliente criado: ${event.data.object.id}`);
      // Aqui você pode adicionar lógica para lidar com o cliente criado
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
