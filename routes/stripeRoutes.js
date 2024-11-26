//routes/stripeRoutes.js
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

const pool = db(true); // Conexão com pool de promessas

// Rota para criar um cliente Stripe
router.post('/create-stripe-customer', authenticateToken, async (req, res) => {
  const { email, id: userId } = req.user;

  try {
    // Verifica se o usuário já tem um cliente Stripe associado
    const [existingCustomer] = await pool.query(
      'SELECT StripeCustomerId FROM subscriptions WHERE UserId = ? LIMIT 1',
      [userId]
    );

    // Se o cliente já existir na tabela subscriptions, retorna os dados
    if (existingCustomer.length > 0 && existingCustomer[0].StripeCustomerId) {
      return res.status(200).json({
        message: 'Cliente já existe no Stripe',
        customerId: existingCustomer[0].StripeCustomerId,
      });
    }

    // Cria um novo cliente no Stripe
    const customer = await stripe.customers.create({ email });

    // Cria a inscrição do cliente na tabela subscriptions
    await pool.query(
      'INSERT INTO subscriptions (UserId, Email, StripeCustomerId, SubscriptionStatus) VALUES (?, ?, ?, ?)',
      [userId, email, customer.id, 'inactive'] // Define status inicial como 'inactive'
    );

    // Atualiza o StripeCustomerId na tabela users
    await pool.query(
      'UPDATE users SET StripeCustomerId = ? WHERE id = ?',
      [customer.id, userId]
    );

    // Retorna o ID do cliente criado no Stripe
    return res.status(200).json({
      message: 'Cliente criado no Stripe com sucesso',
      customerId: customer.id,
    });
  } catch (error) {
    console.error('Erro ao criar cliente no Stripe:', error);
    return res.status(500).json({ error: 'Erro ao criar cliente no Stripe' });
  }
});

// Rota para criar uma sessão de checkout
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  const { id: userId, email } = req.user;

  try {
    const [customerResult] = await pool.query(
      'SELECT StripeCustomerId FROM subscriptions WHERE UserId = ? LIMIT 1',
      [userId]
    );

    const customerId = customerResult[0]?.StripeCustomerId;

    if (!customerId) {
      return res.status(400).json({ error: 'Cliente não encontrado no Stripe.' });
    }

    const productId = process.env.STRIPE_PRODUCT_ID;
    const prices = await stripe.prices.list({ product: productId });

    if (prices.data.length === 0) {
      return res.status(400).send('Nenhum preço encontrado para o produto.');
    }

    const priceId = prices.data[0].id;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/home`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-failed`,
      customer: customerId,
      subscription_data: {
        trial_period_days: 3,
        metadata: { userId },
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).send('Erro ao criar sessão de checkout');
  }
});

// Endpoint para verificar o status da assinatura
router.get('/check-subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT SubscriptionStatus
      FROM subscriptions
      WHERE UserId = ?
      ORDER BY SubscriptionStartDate DESC
      LIMIT 1
    `;
    const [results] = await pool.query(query, [userId]);

    if (results.length === 0) {
      return res.status(200).json({ error: 'Assinatura não encontrada.' });
    }

    const { SubscriptionStatus } = results[0];
    return res.status(200).json({ subscriptionStatus: SubscriptionStatus });
  } catch (error) {
    console.error('Erro ao verificar a assinatura:', error);
    return res.status(500).json({ error: 'Erro ao verificar a assinatura.' });
  }
});

module.exports = router;
