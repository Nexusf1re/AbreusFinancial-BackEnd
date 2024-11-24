const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

// Rota para verificar o status de uma assinatura
router.get('/check-subscription/:userId', (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório.' });
  }

  // Buscar a assinatura no banco de dados
  const query = 'SELECT * FROM subscriptions WHERE UserId = ? ORDER BY SubscriptionStartDate DESC LIMIT 1';

  pool.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Erro ao verificar status da assinatura:', err);
      return res.status(500).json({ error: 'Erro ao verificar status da assinatura.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada.' });
    }

    const subscription = results[0]; 
    res.status(200).json({
      subscriptionStatus: subscription.SubscriptionStatus,
      subscriptionPlan: subscription.SubscriptionPlan,
      subscriptionStartDate: subscription.SubscriptionStartDate,
      subscriptionEndDate: subscription.SubscriptionEndDate,
    });
  });
});


router.post("/payment", authenticateToken, async (req, res) => {
  const { email } = req.body;
  const { id: userId } = req.user; // Acessando o userId do token

  // Verifique se o usuário existe no banco de dados
  const getUserQuery = 'SELECT * FROM users WHERE Id = ?';
  pool.query(getUserQuery, [userId], async (err, userResults) => {
    if (err) {
      console.error("Erro ao verificar o usuário:", err);
      return res.status(500).json({ message: "Erro ao processar o pagamento." });
    }

    if (userResults.length === 0) {
      return res.status(400).json({ message: "Usuário não encontrado." });
    }

    try {
      // Criar o cliente na Stripe
      const stripeCustomer = await stripe.customers.create({
        email: email,
        description: `Customer for ${email}`,
      });

      // Criar a assinatura com o plano
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomer.id,
        items: [{ plan: process.env.STRIPE_PLAN_ID }],  // Use o ID do seu plano da Stripe
        trial_period_days: 3, // Caso tenha um período de teste
      });

      // Inserir dados na tabela subscriptions
      const subscriptionInsertQuery = `
        INSERT INTO subscriptions (UserId, Email, StripeCustomerId, StripeSubscriptionId, SubscriptionPlan, SubscriptionStatus, TrialStartDate, SubscriptionStartDate)
        VALUES (?, ?, ?, ?, 'trial', 'trial', NOW(), NOW())
      `;
      pool.query(subscriptionInsertQuery, [
        userId, // Usando o userId extraído do token
        email,
        stripeCustomer.id,
        subscription.id,
      ], (err, result) => {
        if (err) {
          console.error("Erro ao inserir dados da assinatura:", err);
          return res.status(500).json({ message: "Erro ao registrar a assinatura." });
        }

        res.status(200).json({
          message: "Pagamento realizado com sucesso, cliente e assinatura criados!",
          subscriptionId: subscription.id,
        });
      });

    } catch (error) {
      console.error("Erro ao processar o pagamento:", error);
      res.status(500).json({ message: "Erro ao processar o pagamento." });
    }
  });
});



module.exports = router;
