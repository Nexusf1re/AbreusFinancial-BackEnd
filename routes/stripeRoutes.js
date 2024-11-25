//routes/stripesRoutes.js
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

const pool = db(true); // Conexão com pool de promessas

// Rota para verificar o status de uma assinatura
router.get('/check-subscription', authenticateToken, async (req, res) => {
  const { id, email } = req.user; // Pegando userId e email do JWT

  if (!id || !email) {
    console.log('userId e email são obrigatórios.');
    return res.status(400).json({ error: 'userId e email são obrigatórios.' });
  }

  try {
    const [results] = await pool.query(
      'SELECT * FROM subscriptions WHERE UserId = ? ORDER BY SubscriptionStartDate DESC LIMIT 1',
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: 'Nenhuma assinatura ativa encontrada.' });
    }

    const subscription = results[0];
    return res.status(200).json({
      subscriptionStatus: subscription.SubscriptionStatus,
      subscriptionPlan: subscription.SubscriptionPlan,
      subscriptionStartDate: subscription.SubscriptionStartDate,
      subscriptionEndDate: subscription.SubscriptionEndDate,
    });
  } catch (err) {
    console.error('Erro ao verificar status da assinatura:', err);
    return res.status(500).json({ error: 'Erro ao verificar status da assinatura.' });
  }
});

// Rota para criar um cliente Stripe
router.post('/create-stripe-customer', authenticateToken, async (req, res) => {
  const { email, id } = req.user;

  try {
    const [result] = await pool.query('SELECT StripeCustomerId FROM subscriptions WHERE Email = ?', [email]);

    if (result[0]?.StripeCustomerId) {
      return res.status(200).json({ message: 'Cliente já existe no Stripe', customerId: result[0].StripeCustomerId });
    }

    const customer = await stripe.customers.create({ email });

    return res.status(200).json({ message: 'Cliente criado no Stripe com sucesso', customerId: customer.id });
  } catch (error) {
    console.error('Erro ao criar cliente no Stripe:', error);
    return res.status(500).json({ error: 'Erro ao criar cliente no Stripe' });
  }
});

// Rota para criar uma sessão de checkout
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  const { customerId } = req.body;

  try {
    const productId = 'prod_RH1DyFkPbpBYCL';
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
        metadata: { userId: req.user.id },
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).send('Erro ao criar sessão de checkout');
  }
});

module.exports = router;
