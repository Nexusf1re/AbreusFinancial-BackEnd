const db = require('../config/db');
const pool = db(true);

// Cache usando Map
const subscriptionCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em milissegundos

const verifySubscription = async (req, res, next) => {
    const userId = req.user.id;
    
    // Verifica se existe cache válido
    const cachedData = subscriptionCache.get(userId);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        if (cachedData.status === 'active' || cachedData.status === 'trialing') {
            return next();
        }
        return res.status(403).json({ 
            message: "Acesso negado. Assinatura inativa ou inexistente.",
            requiresSubscription: true
        });
    }

    const query = `
        SELECT SubscriptionStatus 
        FROM subscriptions 
        WHERE UserId = ?
        ORDER BY SubscriptionStartDate DESC 
        LIMIT 1
    `;

    try {
        const [rows] = await pool.query(query, [userId]);

        // Armazena no cache
        if (rows && rows.length > 0) {
            subscriptionCache.set(userId, {
                status: rows[0].SubscriptionStatus,
                timestamp: Date.now()
            });
        }

        if (!rows || rows.length === 0 || 
            (rows[0].SubscriptionStatus !== 'active' && 
             rows[0].SubscriptionStatus !== 'trialing')) {
            return res.status(403).json({ 
                message: "Acesso negado. Assinatura inativa ou inexistente.",
                requiresSubscription: true
            });
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
        return res.status(500).json({ message: "Erro ao verificar assinatura." });
    }
};

// Função para limpar o cache de um usuário específico
const clearUserCache = (userId) => {
    subscriptionCache.delete(userId);
};

// Função para limpar todo o cache
const clearAllCache = () => {
    subscriptionCache.clear();
};

module.exports = {
    verifySubscription,
    clearUserCache,
    clearAllCache
}; 