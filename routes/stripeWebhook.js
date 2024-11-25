const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db'); // Configure corretamente a conexão com o banco de dados
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const pool = db(true);

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('Evento construído com sucesso:', event.type);
  } catch (err) {
    console.error('Erro ao validar webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Lógica para tratar diferentes tipos de evento
  switch (event.type) {
    // Eventos de cliente
    case 'customer.created':
      const customerCreated = event.data.object;
      console.log(`Novo cliente criado: ${customerCreated.id}`);

      const checkCustomerQuery = `
        SELECT * FROM subscriptions WHERE StripeCustomerId = ?
      `;
      pool.query(checkCustomerQuery, [customerCreated.id], (err, results) => {
        if (err) {
          console.error('Erro ao verificar cliente existente:', err);
        } else if (results.length > 0) {
          console.log('Cliente já existe no banco de dados:', results[0]);
        } else {
          const createCustomerQuery = `
            INSERT INTO subscriptions (StripeCustomerId, SubscriptionStatus, TrialStartDate)
            VALUES (?, ?, ?)
          `;
          const createCustomerValues = [customerCreated.id, 'trial', new Date()];
          pool.query(createCustomerQuery, createCustomerValues, (err, result) => {
            if (err) {
              console.error('Erro ao salvar o cliente criado:', err);
            } else {
              console.log('Cliente criado com sucesso no banco de dados:', result);
            }
          });
        }
      });
      break;

    case 'customer.updated':
      const customerUpdated = event.data.object;
      console.log(`Cliente atualizado: ${customerUpdated.id}`);

      const updateCustomerQuery = `
        UPDATE users
        SET email = ?
        WHERE StripeCustomerId = ?
      `;
      const updateCustomerValues = [customerUpdated.email, customerUpdated.id];
      pool.query(updateCustomerQuery, updateCustomerValues, (err, result) => {
        if (err) {
          console.error('Erro ao atualizar informações do cliente:', err);
        } else {
          console.log('Informações do cliente atualizadas com sucesso:', result);
        }
      });
      break;

    // Eventos de assinatura
    case 'customer.subscription.created':
      const subscriptionCreated = event.data.object;
      console.log(`Nova assinatura criada: ${subscriptionCreated.id}`);

      const checkSubscriptionQuery = `
        SELECT * FROM subscriptions WHERE StripeSubscriptionId = ?
      `;
      pool.query(checkSubscriptionQuery, [subscriptionCreated.id], (err, results) => {
        if (err) {
          console.error('Erro ao verificar assinatura existente:', err);
        } else if (results.length > 0) {
          console.log('Assinatura já existe no banco de dados:', results[0]);
        } else {
          const subscriptionCreatedQuery = `
            INSERT INTO subscriptions (StripeCustomerId, StripeSubscriptionId, SubscriptionStatus, SubscriptionStartDate)
            VALUES (?, ?, ?, ?)
          `;
          const subscriptionCreatedValues = [
            subscriptionCreated.customer,
            subscriptionCreated.id,
            subscriptionCreated.status,
            new Date(subscriptionCreated.current_period_start * 1000),
          ];
          pool.query(subscriptionCreatedQuery, subscriptionCreatedValues, (err, result) => {
            if (err) {
              console.error('Erro ao salvar assinatura criada:', err);
            } else {
              console.log('Assinatura criada com sucesso no banco de dados:', result);
            }
          });
        }
      });
      break;

    case 'customer.subscription.updated':
      const subscriptionUpdated = event.data.object;
      console.log(`Assinatura atualizada: ${subscriptionUpdated.id}`);

      const subscriptionUpdatedQuery = `
        UPDATE subscriptions
        SET SubscriptionStatus = ?, SubscriptionEndDate = ?, LastPaymentDate = ?
        WHERE StripeSubscriptionId = ?
      `;
      const subscriptionUpdatedValues = [
        subscriptionUpdated.status,
        new Date(subscriptionUpdated.current_period_end * 1000),
        new Date(subscriptionUpdated.current_period_start * 1000),
        subscriptionUpdated.id,
      ];
      pool.query(subscriptionUpdatedQuery, subscriptionUpdatedValues, (err, result) => {
        if (err) {
          console.error('Erro ao atualizar assinatura:', err);
        } else {
          console.log('Assinatura atualizada com sucesso no banco de dados:', result);
        }
      });
      break;

    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object;
      console.log(`Assinatura cancelada: ${subscriptionDeleted.id}`);

      const subscriptionDeletedQuery = `
        UPDATE subscriptions
        SET SubscriptionStatus = 'canceled'
        WHERE StripeSubscriptionId = ?
      `;
      const subscriptionDeletedValues = [subscriptionDeleted.id];
      pool.query(subscriptionDeletedQuery, subscriptionDeletedValues, (err, result) => {
        if (err) {
          console.error('Erro ao cancelar assinatura:', err);
        } else {
          console.log('Assinatura cancelada com sucesso no banco de dados:', result);
        }
      });
      break;

    // Eventos de pagamento de fatura
    case 'invoice.payment_succeeded':
      const paymentSucceeded = event.data.object;
      console.log(`Pagamento de fatura bem-sucedido: ${paymentSucceeded.id}`);

      const updatePaymentQuery = `
        UPDATE subscriptions
        SET SubscriptionStatus = 'active', LastPaymentDate = ?
        WHERE StripeSubscriptionId = ?
      `;
      const updatePaymentValues = [new Date(), paymentSucceeded.subscription];
      pool.query(updatePaymentQuery, updatePaymentValues, (err, result) => {
        if (err) {
          console.error('Erro ao atualizar assinatura após pagamento:', err);
        } else {
          console.log('Assinatura atualizada após pagamento bem-sucedido:', result);
        }
      });
      break;

    case 'invoice.payment_failed':
      const paymentFailed = event.data.object;
      console.log(`Falha no pagamento da fatura: ${paymentFailed.id}`);
      break;

    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  res.status(200).send();
});

module.exports = router;
