const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const pool = db(true);
const router = express.Router();

// routes/stripeWebhook.js
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('Evento recebido:', event.type);
  } catch (err) {
    console.error('Erro ao validar webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        const subscriptionCreated = event.data.object;
        const customerId = subscriptionCreated.customer;
        const subscriptionId = subscriptionCreated.id;
        const planName = subscriptionCreated.items.data[0].plan.nickname; // Nome do plano
        const startDate = new Date(subscriptionCreated.start_date * 1000); // Data de início
        const endDate = new Date(subscriptionCreated.current_period_end * 1000); // Data de término
        const status = subscriptionCreated.status; // Status da assinatura
        const trialStart = subscriptionCreated.trial_start;
        const trialEnd = subscriptionCreated.trial_end;
        const trialUsed = trialStart && trialEnd ? true : false; // Define como true se o período de teste foi iniciado

        // Verificar se a assinatura já existe na tabela subscriptions
        const [existingSubscription] = await pool.query(
          'SELECT StripeSubscriptionId FROM subscriptions WHERE StripeSubscriptionId = ? LIMIT 1',
          [subscriptionId]
        );

        if (existingSubscription.length === 0) {
          // Se a assinatura não existir, cria a nova entrada na tabela subscriptions
          const [user] = await pool.query(
            'SELECT id FROM users WHERE StripeCustomerId = ? LIMIT 1',
            [customerId]
          );

          if (user.length > 0) {
            const userId = user[0].id;

            // Cria a assinatura na tabela de subscriptions
            await pool.query(
              'INSERT INTO subscriptions (UserId, Email, StripeCustomerId, StripeSubscriptionId, SubscriptionPlan, SubscriptionStatus, TrialUsed, TrialStartDate, SubscriptionStartDate, SubscriptionEndDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                userId,
                subscriptionCreated.email,
                customerId,
                subscriptionId,
                planName,  // Plano de assinatura
                status,    // Status da assinatura
                trialUsed, // Define o campo TrialUsed
                trialStart ? new Date(trialStart * 1000) : null,  // Adiciona TrialStartDate
                startDate,  // SubscriptionStartDate
                endDate     // SubscriptionEndDate
              ]
            );

            console.log('Assinatura criada e dados de cliente atualizados.');
          } else {
            console.log('Usuário não encontrado para o StripeCustomerId.');
          }
        } else {
          console.log('Assinatura já registrada no banco de dados.');
        }
        break;


      // Evento para quando o pagamento for bem-sucedido
// Evento para quando o pagamento for bem-sucedido
case 'invoice.payment_succeeded':
  const invoicePaid = event.data.object;

  // Calcular a data de término (um mês após o pagamento)
  const subscriptionPeriodEndDate = new Date(invoicePaid.created * 1000);
  subscriptionPeriodEndDate.setMonth(subscriptionPeriodEndDate.getMonth() + 1); // Adiciona um mês

  // Atualiza informações de pagamento na tabela subscriptions
  // Inclui os campos SubscriptionStartDate e SubscriptionEndDate
  await pool.query(
    'UPDATE subscriptions SET LastPaymentDate = ?, TrialUsed = ?, TrialStartDate = ?, SubscriptionPlan = ?, SubscriptionStatus = ?, SubscriptionStartDate = ?, SubscriptionEndDate = ? WHERE StripeCustomerId = ?',
    [
      new Date(invoicePaid.created * 1000), // Data do pagamento
      true, // Define TrialUsed como true após o pagamento
      new Date(invoicePaid.created * 1000), // Define o TrialStartDate como a data do pagamento
      'pro', // Define o plano como "pro"
      'active',
      new Date(invoicePaid.created * 1000), // Define a SubscriptionStartDate como a data do pagamento
      subscriptionPeriodEndDate, // Define a SubscriptionEndDate para um mês após o pagamento
      invoicePaid.customer, // ID do cliente
    ]
  );
  console.log('Informações de pagamento e assinatura atualizadas para o primeiro pagamento no banco de dados.');
  break;



      case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object;

        // Atualiza os dados da assinatura na tabela de subscriptions
        await pool.query(
          'UPDATE subscriptions SET SubscriptionStatus = ?, SubscriptionEndDate = ?, LastPaymentDate = ? WHERE StripeSubscriptionId = ?',
          [
            subscriptionUpdated.status,
            new Date(subscriptionUpdated.current_period_end * 1000), // Data de término da assinatura
            new Date(subscriptionUpdated.current_period_start * 1000), // Último pagamento
            subscriptionUpdated.id,
          ]
        );
        console.log('Assinatura atualizada no banco de dados.');
        break;

      case 'checkout.session.completed':
        const session = event.data.object;
        const sessionSubscriptionId = session.subscription;
        const sessionCustomerId = session.customer;
        const sessionPlanName = session.metadata.plan; // O nome do plano pode estar no metadata ou em outro lugar

        // Atualiza a assinatura com os dados do checkout
        await pool.query(
          'UPDATE subscriptions SET StripeSubscriptionId = ?, SubscriptionPlan = ? WHERE StripeCustomerId = ?',
          [
            sessionSubscriptionId,
            sessionPlanName,
            sessionCustomerId,
          ]
        );
        console.log('Assinatura atualizada com os dados do checkout.');
        break;

      default:
        console.log(`Evento ${event.type} não tratado.`);
    }

    res.status(200).send();
  } catch (error) {
    console.error('Erro ao processar evento do webhook:', error);
    res.status(500).send('Erro ao processar webhook.');
  }
});

module.exports = router;
