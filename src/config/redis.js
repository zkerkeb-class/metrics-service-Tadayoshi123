// src/config/redis.js
const { createClient } = require('redis');
const { logger } = require('./logger');

/**
 * Obtient la configuration Redis à partir des variables d'environnement
 * @returns {Object} Configuration Redis
 */
const getRedisConfig = () => {
  // Configuration pour l'infrastructure partagée SupervIA
  const redisUrl = process.env.REDIS_URL || 'redis://supervia-redis:6379/2';
  
  return {
    url: redisUrl,
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB || '2'), // DB 2 pour metrics-service
    socket: {
      reconnectStrategy: (retries) => {
        // Stratégie de reconnexion exponentielle avec un maximum de 20 tentatives
        if (retries > 20) {
          logger.error(`Échec de connexion Redis après ${retries} tentatives. Abandon.`);
          return new Error('Nombre maximum de tentatives de reconnexion Redis atteint');
        }
        
        // Délai exponentiel avec un maximum de 3 secondes
        const delay = Math.min(Math.pow(2, retries) * 100, 3000);
        logger.info(`Tentative de reconnexion Redis dans ${delay}ms (tentative ${retries})`);
        return delay;
      },
      connectTimeout: 10000 // 10 secondes de timeout
    }
  };
};

// Client Redis
let redisClient = null;

/**
 * Initialise le client Redis
 * @returns {Promise<Object>} Client Redis initialisé
 */
const initRedis = async () => {
  try {
    // Créer un nouveau client Redis avec la configuration
    redisClient = createClient(getRedisConfig());
    
    // Gestionnaires d'événements
    redisClient.on('error', (err) => {
      logger.error(`Erreur Redis: ${err.message}`);
    });
    
    redisClient.on('connect', () => {
      logger.info('Connecté à Redis');
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('Tentative de reconnexion à Redis...');
    });
    
    redisClient.on('ready', () => {
      logger.info('Client Redis prêt');
    });
    
    // Connexion au serveur Redis
    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    logger.error(`Erreur lors de l'initialisation du client Redis: ${error.message}`);
    throw error;
  }
};

/**
 * Ferme la connexion Redis
 * @returns {Promise<void>}
 */
const closeRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('Connexion Redis fermée proprement');
    } catch (error) {
      logger.error(`Erreur lors de la fermeture de Redis: ${error.message}`);
      // Force la fermeture en cas d'erreur
      redisClient.disconnect();
    }
  }
};

/**
 * Obtient le client Redis, l'initialise si nécessaire
 * @returns {Promise<Object>} Client Redis
 */
const getRedisClient = async () => {
  if (!redisClient || !redisClient.isOpen) {
    return await initRedis();
  }
  return redisClient;
};

/**
 * Vérifie si Redis est disponible
 * @returns {Promise<boolean>} true si Redis est disponible, false sinon
 */
const isRedisAvailable = async () => {
  try {
    const client = await getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    logger.error(`Redis n'est pas disponible: ${error.message}`);
    return false;
  }
};

// Fonction pour enregistrer des métriques dans Redis
const storeMetrics = async (key, data, expiration = 86400) => {
  try {
    if (!redisClient || !redisClient.isOpen) await initRedis();
    await redisClient.setEx(key, expiration, JSON.stringify(data));
    return true;
  } catch (error) {
    logger.error(`Erreur lors du stockage des métriques dans Redis: ${error.message}`);
    return false;
  }
};

// Fonction pour récupérer des métriques depuis Redis
const getMetrics = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) await initRedis();
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Erreur lors de la récupération des métriques depuis Redis: ${error.message}`);
    return null;
  }
};

// Fonction pour supprimer des métriques de Redis
const deleteMetrics = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) await initRedis();
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la suppression des métriques de Redis: ${error.message}`);
    return false;
  }
};

module.exports = {
  initRedis,
  closeRedis,
  getRedisClient,
  isRedisAvailable,
  storeMetrics,
  getMetrics,
  deleteMetrics
}; 