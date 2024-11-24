const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const pool = db(true);

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('Evento construído com sucesso:', event);
  } catch (err) {
    console.error('Erro ao validar webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        const paymentSucceeded = event.data.object;
        console.log(`Pagamento de fatura bem-sucedido: ${paymentSucceeded.id}`);

        await pool.query(
          'UPDATE subscriptions SET SubscriptionStatus = ?, LastPaymentDate = ?, SubscriptionStartDate = ? WHERE StripeSubscriptionId = ?',
          ['active', new Date(), new Date(), paymentSucceeded.subscription]
        );
        break;

      case 'invoice.payment_failed':
        console.log(`Falha no pagamento da fatura: ${event.data.object.id}`);
        break;

      case 'customer.subscription.created':
        const subscriptionCreated = event.data.object;
        const customer = await stripe.customers.retrieve(subscriptionCreated.customer);

        await pool.query(
          'INSERT INTO subscriptions (StripeCustomerId, StripeSubscriptionId, SubscriptionStatus, SubscriptionStartDate, UserId, Email) VALUES (?, ?, ?, ?, ?, ?)',
          [
            subscriptionCreated.customer,
            subscriptionCreated.id,
            'active',
            new Date(),
            subscriptionCreated.metadata.userId,
            customer.email,
          ]
        );
        console.log(`Nova assinatura criada: ${subscriptionCreated.id}`);
        break;

      case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object;

        await pool.query(
          'UPDATE subscriptions SET SubscriptionStatus = ?, SubscriptionEndDate = ? WHERE StripeSubscriptionId = ?',
          [
            subscriptionUpdated.status,
            new Date(subscriptionUpdated.current_period_end * 1000),
            subscriptionUpdated.id,
          ]
        );
        break;

      case 'customer.subscription.deleted':
        const subscriptionDeleted = event.data.object;

        await pool.query(
          'UPDATE subscriptions SET SubscriptionStatus = "canceled" WHERE StripeSubscriptionId = ?',
          [subscriptionDeleted.id]
        );
        break;

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.status(200).send();
  } catch (err) {
    console.error('Erro no processamento do webhook:', err);
    res.status(500).send('Erro no processamento do webhook');
  }
});

module.exports = router;
