const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const pool = db(true);

// Funções auxiliares
async function handlePaymentSucceeded(event, connection) {
  const paymentSucceeded = event.data.object;
  console.log(`Pagamento de fatura bem-sucedido: ${paymentSucceeded.id}`);

  await connection.query(
    'UPDATE subscriptions SET SubscriptionStatus = ?, LastPaymentDate = ?, SubscriptionStartDate = ? WHERE StripeSubscriptionId = ?',
    ['active', new Date().toISOString(), new Date().toISOString(), paymentSucceeded.subscription]
  );
}

async function handleSubscriptionCreated(event, connection) {
  const subscriptionCreated = event.data.object;
  const customer = await stripe.customers.retrieve(subscriptionCreated.customer);

  if (!subscriptionCreated.metadata || !subscriptionCreated.metadata.userId) {
    throw new Error('Metadata com userId ausente no evento de assinatura criada.');
  }

  // Iniciar transação para garantir consistência
  await connection.beginTransaction();

  try {
    // Inserir na tabela subscriptions
    await connection.query(
      'INSERT INTO subscriptions (StripeCustomerId, StripeSubscriptionId, SubscriptionStatus, SubscriptionStartDate, UserId, Email) VALUES (?, ?, ?, ?, ?, ?)',
      [
        subscriptionCreated.customer,
        subscriptionCreated.id,
        'active',
        new Date().toISOString(),
        subscriptionCreated.metadata.userId,
        customer.email,
      ]
    );

    // Atualizar StripeCustomerId no usuário correspondente
    await connection.query(
      `UPDATE users 
       SET StripeCustomerId = ? 
       WHERE Id = ?`,
      [subscriptionCreated.customer, subscriptionCreated.metadata.userId]
    );

    await connection.commit();
    console.log(`Nova assinatura criada: ${subscriptionCreated.id}`);
  } catch (err) {
    await connection.rollback();
    throw err;
  }
}

async function handleSubscriptionUpdated(event, connection) {
  const subscriptionUpdated = event.data.object;
  console.log(`Assinatura atualizada: ${subscriptionUpdated.id}`);

  await connection.query(
    'UPDATE subscriptions SET SubscriptionStatus = ?, SubscriptionEndDate = ? WHERE StripeSubscriptionId = ?',
    [
      subscriptionUpdated.status,
      new Date(subscriptionUpdated.current_period_end * 1000).toISOString(),
      subscriptionUpdated.id,
    ]
  );
}

async function handleSubscriptionDeleted(event, connection) {
  const subscriptionDeleted = event.data.object;
  console.log(`Assinatura cancelada: ${subscriptionDeleted.id}`);

  await connection.query(
    'UPDATE subscriptions SET SubscriptionStatus = "canceled" WHERE StripeSubscriptionId = ?',
    [subscriptionDeleted.id]
  );
}

// Rota Webhook
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

  const connection = await pool.getConnection();

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event, connection);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event, connection);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, connection);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, connection);
        break;

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.status(200).send();
  } catch (err) {
    console.error('Erro no processamento do webhook:', err);
    res.status(500).send('Erro no processamento do webhook');
  } finally {
    connection.release();
  }
});

module.exports = router;
