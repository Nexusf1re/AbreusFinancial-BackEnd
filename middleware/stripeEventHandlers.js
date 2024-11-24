// middleware/stripeEventHandlers.js
const pool = require('../config/db');

// Manipulador para evento customer.subscription.created
const handleSubscriptionCreated = (subscriptionCreated) => {
  console.log(`Nova assinatura criada: ${subscriptionCreated.id}`);

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
};

// Manipulador para evento invoice.payment_succeeded
const handleInvoicePaymentSucceeded = async (invoice) => {
  const { customer, subscription, status, created, lines } = invoice;

  try {
    // Aqui, você pode atualizar ou criar a assinatura
    const updateSubscriptionQuery = `
      UPDATE subscriptions 
      SET SubscriptionStatus = ?, SubscriptionStartDate = ?, SubscriptionEndDate = ?
      WHERE StripeSubscriptionId = ?
    `;
    const updateValues = [
      'active', 
      new Date(created * 1000), // Timestamp para data de início
      new Date(created * 1000 + 30 * 24 * 60 * 60 * 1000), // Definindo fim de assinatura (1 mês)
      subscription
    ];
    
    pool.query(updateSubscriptionQuery, updateValues, (err, result) => {
      if (err) {
        console.error('Erro ao atualizar a assinatura após pagamento bem-sucedido:', err);
      } else {
        console.log('Assinatura atualizada com sucesso após pagamento!');
      }
    });
  } catch (err) {
    console.error('Erro ao processar fatura paga com sucesso:', err);
  }
};

// Manipulador para evento invoice.payment_failed
const handleInvoicePaymentFailed = (paymentFailed) => {
  console.log(`Falha no pagamento da fatura: ${paymentFailed.id}`);
  // Lógica adicional pode ser adicionada aqui para tratar falhas de pagamento, como notificar o usuário
};

// Manipulador para evento customer.subscription.updated
const handleSubscriptionUpdated = (subscriptionUpdated) => {
  console.log(`Assinatura atualizada: ${subscriptionUpdated.id}`);

  const updateSubscriptionQuery = `
    UPDATE subscriptions
    SET SubscriptionStatus = ?, SubscriptionEndDate = ?
    WHERE StripeSubscriptionId = ?
  `;
  const updateValues = [
    subscriptionUpdated.status, 
    new Date(subscriptionUpdated.current_period_end * 1000), 
    subscriptionUpdated.id
  ];
  pool.query(updateSubscriptionQuery, updateValues, (err, result) => {
    if (err) {
      console.error('Erro ao atualizar a assinatura:', err);
    } else {
      console.log('Assinatura atualizada com sucesso!');
    }
  });
};

// Manipulador para evento customer.subscription.deleted
const handleSubscriptionDeleted = (subscriptionDeleted) => {
  console.log(`Assinatura cancelada: ${subscriptionDeleted.id}`);

  const cancelSubscriptionQuery = `
    UPDATE subscriptions
    SET SubscriptionStatus = 'canceled'
    WHERE StripeSubscriptionId = ?
  `;
  const cancelValues = [subscriptionDeleted.id];
  pool.query(cancelSubscriptionQuery, cancelValues, (err, result) => {
    if (err) {
      console.error('Erro ao cancelar assinatura:', err);
    } else {
      console.log('Assinatura cancelada com sucesso!');
    }
  });
};

module.exports = {
  handleSubscriptionCreated,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
};
