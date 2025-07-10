const { logger } = require('../config/logger');
const { isRedisAvailable, getRedisClient } = require('../config/redis');
const { getAllServices } = require('../config/services');
const { getMetrics } = require('../config/redis');
const os = require('os');

// Vérifier la santé du service
const checkHealth = async (req, res) => {
  try {
    // Vérifier la connexion Redis (optionnelle)
    let redisStatus = { status: 'down', connected: false };
    try {
      const redisAvailable = await isRedisAvailable();
      redisStatus = {
        status: redisAvailable ? 'up' : 'down',
        connected: redisAvailable
      };
    } catch (error) {
      // Redis optionnel
    }
    
    // Récupérer les informations système
    const system = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: os.cpus(),
      loadavg: os.loadavg(),
      platform: process.platform,
      nodeVersion: process.version
    };
    
    // Services basiques (sans Redis)
    const services = {
      'auth-service': { status: 'unknown', lastCheck: null },
      'ai-service': { status: 'unknown', lastCheck: null },
      'payment-service': { status: 'unknown', lastCheck: null },
      'notifier-service': { status: 'unknown', lastCheck: null }
    };
    
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'metrics-service',
      version: process.env.npm_package_version || '1.0.0',
      dependencies: {
        redis: redisStatus
      },
      system,
      services
    });
  } catch (error) {
    logger.error(`Erreur lors de la vérification de santé: ${error.message}`);
    
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'metrics-service',
      error: error.message
    });
  }
};

// Vérifier la disponibilité du service (endpoint léger)
const checkLiveness = async (req, res) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
};

// Vérifier l'état de préparation du service
const checkReadiness = async (req, res) => {
  try {
    // Le service est prêt même sans Redis
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ready: true
    });
  } catch (error) {
    logger.error(`Service non prêt: ${error.message}`);
    
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      ready: false,
      error: error.message
    });
  }
};

module.exports = {
  checkHealth,
  checkLiveness,
  checkReadiness
}; 