const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/db');  // Aqui você importa o pool
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

  // Lógica para tratar diferentes tipos de evento
  switch (event.type) {
    case 'invoice.payment_succeeded':
      const paymentSucceeded = event.data.object;
      console.log(`Pagamento de fatura bem-sucedido: ${paymentSucceeded.id}`);

      // Atualizar assinatura no banco de dados
      const updateSubscriptionQuery = `
        UPDATE subscriptions
        SET SubscriptionStatus = ?, LastPaymentDate = ?, SubscriptionStartDate = ?
        WHERE StripeSubscriptionId = ?
      `;
      const paymentSucceededValues = ['active', new Date(), new Date(), paymentSucceeded.subscription];
      pool.query(updateSubscriptionQuery, paymentSucceededValues, (err, result) => {
        if (err) {
          console.error('Erro ao atualizar a assinatura:', err);
        } else {
          console.log('Assinatura atualizada com sucesso!', result);
        }
      });
      break;

    case 'invoice.payment_failed':
      const paymentFailed = event.data.object;
      console.log(`Falha no pagamento da fatura: ${paymentFailed.id}`);
      // Tratar falha de pagamento, caso necessário
      break;

    case 'customer.created':
      const customerCreated = event.data.object;
      console.log(`Novo cliente criado: ${customerCreated.id}`);

      // Criar uma nova entrada na tabela de assinaturas
      const createSubscriptionQuery = `
        INSERT INTO subscriptions (StripeCustomerId, SubscriptionStatus, TrialStartDate)
        VALUES (?, ?, ?)
      `;
      const createSubscriptionValues = [customerCreated.id, 'trial', new Date()];
      pool.query(createSubscriptionQuery, createSubscriptionValues, (err, result) => {
        if (err) {
          console.error('Erro ao salvar a assinatura:', err);
        } else {
          console.log('Assinatura criada com sucesso!', result);
        }
      });
      break;

    case 'customer.subscription.created':
      const subscriptionCreated = event.data.object;
      console.log(`Nova assinatura criada: ${subscriptionCreated.id}`);

      // Salvar informações da nova assinatura
      const subscriptionQuery = `
        INSERT INTO subscriptions (StripeCustomerId, StripeSubscriptionId, SubscriptionStatus, SubscriptionStartDate)
        VALUES (?, ?, ?, ?)
      `;
      const subscriptionValues = [subscriptionCreated.customer, subscriptionCreated.id, 'active', new Date()];
      pool.query(subscriptionQuery, subscriptionValues, (err, result) => {
        if (err) {
          console.error('Erro ao salvar assinatura criada:', err);
        } else {
          console.log('Assinatura criada com sucesso no banco de dados:', result);
        }
      });
      break;

    case 'customer.subscription.updated':
      const subscriptionUpdated = event.data.object;
      console.log(`Assinatura atualizada: ${subscriptionUpdated.id}`);

      // Atualizar informações da assinatura
      const updateSubscriptionQueryUpdated = `
        UPDATE subscriptions
        SET SubscriptionStatus = ?, SubscriptionEndDate = ?
        WHERE StripeSubscriptionId = ?
      `;
      const subscriptionUpdatedValues = [subscriptionUpdated.status, new Date(subscriptionUpdated.current_period_end * 1000), subscriptionUpdated.id];
      pool.query(updateSubscriptionQueryUpdated, subscriptionUpdatedValues, (err, result) => {
        if (err) {
          console.error('Erro ao atualizar a assinatura:', err);
        } else {
          console.log('Assinatura atualizada com sucesso!', result);
        }
      });
      break;

    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object;
      console.log(`Assinatura cancelada: ${subscriptionDeleted.id}`);

      // Marcar assinatura como cancelada no banco de dados
      const deleteSubscriptionQuery = `
        UPDATE subscriptions
        SET SubscriptionStatus = 'canceled'
        WHERE StripeSubscriptionId = ?
      `;
      const deleteSubscriptionValues = [subscriptionDeleted.id];
      pool.query(deleteSubscriptionQuery, deleteSubscriptionValues, (err, result) => {
        if (err) {
          console.error('Erro ao cancelar assinatura:', err);
        } else {
          console.log('Assinatura cancelada com sucesso!', result);
        }
      });
      break;

    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  res.status(200).send();
});

module.exports = router;
