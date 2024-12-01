const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');
const { subscriptionCache } = require('../middleware/subscriptionMiddleware');
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

        console.log(subscriptionCreated);
        // Verificar se já existe um cliente com o StripeCustomerId
        const [existingCustomer] = await pool.query(
          'SELECT StripeCustomerId FROM subscriptions WHERE StripeCustomerId = ? LIMIT 1',
          [customerId] // Verifica apenas o StripeCustomerId
        );

        if (existingCustomer.length === 0) {
          // Se não houver um cliente com esse StripeCustomerId, faz o INSERT
          const [user] = await pool.query(
            'SELECT id FROM users WHERE StripeCustomerId = ? LIMIT 1',
            [customerId]
          );

          if (user.length > 0) {
            const userId = user[0].id;
            subscriptionCache.delete(userId);
            console.log(`[TRIGGER: customer.subscription.created] Cache removido para o usuário ID: ${userId}`);

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

            console.log('Assinatura criada e dados de cliente atualizados. CUSTOMER.CREATED INSERT');
          } else {
            console.log('Usuário não encontrado para o StripeCustomerId.');
          }
        } else {
          console.log('Cliente já existe, não será criada uma nova assinatura.');
        }

        break;


      // Evento para quando o pagamento for bem-sucedido
      case 'invoice.payment_succeeded':
        const invoicePaid = event.data.object;
        const paidSubscriptionId = invoicePaid.subscription;
        console.log(invoicePaid);
        // Recupera a assinatura existente para verificar seu status
        const [paidSubscription] = await pool.query(
          'SELECT * FROM subscriptions WHERE StripeSubscriptionId = ? LIMIT 1',
          [paidSubscriptionId]
        );

        if (paidSubscription.length > 0) {
          const subscriptionData = paidSubscription[0];
          const [user] = await pool.query(
            'SELECT UserId FROM subscriptions WHERE StripeSubscriptionId = ? LIMIT 1',
            [paidSubscriptionId]
          );
          if (user.length > 0) {
            subscriptionCache.delete(user[0].UserId);
            console.log(`[TRIGGER: invoice.payment_succeeded] Cache removido para o usuário ID: ${user[0].UserId}`);
          }

          // Verifica se o período de teste foi usado (TrialUsed)
          if (subscriptionData.TrialUsed == 1) {
            // O pagamento foi feito após o período de teste, então muda para 'active' e 'pro'
            const subscriptionPeriodEndDate = new Date(invoicePaid.created * 1000);
            subscriptionPeriodEndDate.setMonth(subscriptionPeriodEndDate.getMonth() + 1); // Define o fim do período

            // Atualiza a assinatura para o status 'active' após o pagamento
            await pool.query(
              'UPDATE subscriptions SET SubscriptionStatus = ?, SubscriptionPlan = ?, SubscriptionStartDate = ?, SubscriptionEndDate = ?, LastPaymentDate = ? WHERE StripeSubscriptionId = ?',
              [
                'active', // Atualiza o status para 'active'
                'pro', // Define o plano como 'pro'
                new Date(invoicePaid.created * 1000), // Data de início da assinatura
                subscriptionPeriodEndDate, // Data de término do plano
                new Date(invoicePaid.created * 1000), // Última data de pagamento
                paidSubscriptionId, // Identificador da assinatura
              ]
            );
            console.log('Assinatura PRO definida atualizada após o pagamento do cliente. UPDATE');
          } else {
            // Caso contrário, o cliente ainda está no período de teste, então a assinatura permanece em 'trialing'
            const trialStartDate = new Date(invoicePaid.created * 1000);
            const trialEndDate = new Date(trialStartDate);
            trialEndDate.setMonth(trialEndDate.getMonth() + 1); // Define a duração do trial (1 mês)

            await pool.query(
              'UPDATE subscriptions SET  SubscriptionPlan = ?,SubscriptionStatus = ?, TrialUsed = 1, TrialStartDate = ?, SubscriptionStartDate = ?, SubscriptionEndDate = ?, LastPaymentDate = ? WHERE StripeSubscriptionId = ?',
              [
                'trial',
                'trialing', // Continua no status 'trialing'
                trialStartDate, // Define o início do trial
                trialStartDate, // A assinatura começa com o trial
                trialEndDate,   // Define o final do período de trial
                new Date(invoicePaid.created * 1000), // Última data de pagamento
                paidSubscriptionId, // Identificador da assinatura
              ]
            );
            console.log('Assinatura em TRIAL definida, dados atualizados. UPDATE');
          }
        } else {
          console.log('Assinatura não encontrada para o StripeSubscriptionId:', paidSubscriptionId);
        }
        break;


      case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object;
        console.log(subscriptionUpdated);
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
        console.log('Assinatura atualizada no banco de dados. CUSTOMER.SUBSCRIPTION.UPDATED');
      
        // Busca o UserId para invalidar o cache
        const [updatedUser] = await pool.query(
          'SELECT UserId FROM subscriptions WHERE StripeSubscriptionId = ? LIMIT 1',
          [subscriptionUpdated.id]
        );
        if (updatedUser.length > 0) {
          subscriptionCache.delete(updatedUser[0].UserId);
          console.log(`[TRIGGER: customer.subscription.updated] Cache removido para o usuário ID: ${updatedUser[0].UserId}`);
        }
        break;
      
      case 'customer.subscription.deleted':
        const subscriptionDeleted = event.data.object;
        console.log(subscriptionDeleted);
        // Atualiza os dados da assinatura na tabela de subscriptions para refletir a exclusão
        await pool.query(
          'UPDATE subscriptions SET SubscriptionStatus = ?, SubscriptionEndDate = ?, LastPaymentDate = ? WHERE StripeSubscriptionId = ?',
          [
            'canceled', // Atualiza o status para 'canceled'
            new Date(subscriptionDeleted.current_period_end * 1000), // Data de término da assinatura
            new Date(subscriptionDeleted.current_period_start * 1000), // Último pagamento
            subscriptionDeleted.id,
          ]
        );
        console.log('Assinatura cancelada no banco de dados. CUSTOMER.SUBSCRIPTION.DELETED');
      
        // Busca o UserId para invalidar o cache
        const [deletedUser] = await pool.query(
          'SELECT UserId FROM subscriptions WHERE StripeSubscriptionId = ? LIMIT 1',
          [subscriptionDeleted.id]
        );
        if (deletedUser.length > 0) {
          subscriptionCache.delete(deletedUser[0].UserId);
          console.log(`[TRIGGER: customer.subscription.deleted] Cache removido para o usuário ID: ${deletedUser[0].UserId}`);
        }
        break;

      case 'checkout.session.completed':
        const session = event.data.object;
        const sessionSubscriptionId = session.subscription;
        const sessionCustomerId = session.customer;
        const sessionPlanName = session.metadata.plan;

        console.log(session);
        // Atualiza a assinatura com os dados do checkout
        await pool.query(
          'UPDATE subscriptions SET StripeSubscriptionId = ?, SubscriptionPlan = ? WHERE StripeCustomerId = ?',
          [
            sessionSubscriptionId,
            sessionPlanName,
            sessionCustomerId,
          ]
        );
        console.log('Assinatura atualizada com os dados do checkout. CHECKOUT.SESSION.COMPLETED');

        // Busca o UserId para invalidar o cache
        const [checkoutUser] = await pool.query(
          'SELECT UserId FROM subscriptions WHERE StripeCustomerId = ? LIMIT 1',
          [session.customer]
        );
        if (checkoutUser.length > 0) {
          subscriptionCache.delete(checkoutUser[0].UserId);
          console.log(`[TRIGGER: checkout.session.completed] Cache removido para o usuário ID: ${checkoutUser[0].UserId}`);
        }
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