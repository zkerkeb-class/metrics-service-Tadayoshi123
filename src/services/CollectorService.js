// src/services/CollectorService.js
const axios = require('axios');
const { logger } = require('../config/logger');
const { serviceStatus, serviceResponseTime, scrapingErrorsTotal } = require('../middlewares/metrics');
const { storeMetrics } = require('../config/redis');
const { getAllServices } = require('../config/services');
const { URL } = require('url');

// L'intervalle de collecte est maintenant la seule configuration locale
const COLLECTION_INTERVAL = parseInt(process.env.METRICS_COLLECTION_INTERVAL || '60000');

/**
 * Collecte les métriques d'un service
 * @param {Object} service - Service à surveiller (depuis config/services.js)
 * @returns {Promise<Object>} Métriques collectées
 */
const collectServiceMetrics = async (service) => {
  const startTime = Date.now();
  let healthEndpoint = '';
  
  try {
    // Construction de l'URL de manière sécurisée
    healthEndpoint = new URL(service.healthPath, service.url).toString();
    
    // Utilise le timeout du service ou un timeout par défaut de 10s
    const requestTimeout = service.timeout || 10000;
    const response = await axios.get(healthEndpoint, { 
      timeout: requestTimeout,
      headers: {
        'User-Agent': 'SupervIA-Metrics-Collector/1.0',
        'Accept': 'application/json'
      }
    });
    
    const responseTime = (Date.now() - startTime) / 1000;
    
    // Mise à jour des métriques Prometheus
    serviceStatus.set({ service: service.id }, 1);
    serviceResponseTime.set({ service: service.id }, responseTime);
    
    // Données à stocker
    const metrics = {
      timestamp: new Date().toISOString(),
      service: service.id,
      status: 'up',
      responseTime,
      data: response.data
    };
    
    // Stocker les métriques
    await storeMetrics(`${service.id}:health`, metrics);
    
    logger.debug(`Métriques collectées pour ${service.id}: ${responseTime.toFixed(3)}s`);
    return metrics;
  } catch (error) {
    const responseTime = (Date.now() - startTime) / 1000;
    
    // Mise à jour des métriques Prometheus
    serviceStatus.set({ service: service.id }, 0);
    serviceResponseTime.set({ service: service.id }, responseTime);
    scrapingErrorsTotal.inc({ service: service.id });
    
    // Données à stocker
    const metrics = {
      timestamp: new Date().toISOString(),
      service: service.id,
      status: 'down',
      responseTime,
      error: error.message
    };
    
    // Stocker les métriques
    await storeMetrics(`${service.id}:health`, metrics);
    
    logger.warn(`Échec de collecte pour ${service.id} à l'URL [${healthEndpoint}]: ${error.message}`);
    return metrics;
  }
};

/**
 * Collecte les métriques de tous les services
 * @returns {Promise<Array>} Résultats de la collecte
 */
const collectAllMetrics = async () => {
  logger.info('Début de la collecte des métriques pour tous les services...');
  const servicesToMonitor = getAllServices(); // Utilise la configuration centrale
  
  try {
    const results = await Promise.allSettled(
      servicesToMonitor.map(service => collectServiceMetrics(service))
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 'up').length;
    const failCount = results.length - successCount;
    
    logger.info(`Collecte terminée: ${successCount} services UP, ${failCount} DOWN/échecs`);
    
    const metricsByService = {};
    results.forEach((result, index) => {
      const serviceName = servicesToMonitor[index].id;
      if (result.status === 'fulfilled') {
        metricsByService[serviceName] = result.value;
      } else {
        logger.error(`Erreur lors de la collecte pour ${serviceName}: ${result.reason}`);
        metricsByService[serviceName] = {
          service: serviceName,
          status: 'error',
          error: result.reason.message
        };
      }
    });
    return metricsByService;
  } catch (error) {
    logger.error(`Erreur globale lors de la collecte des métriques: ${error.message}`);
    throw error;
  }
};

// Variable pour stocker l'intervalle de collecte
let collectorInterval = null;

/**
 * Configure et démarre les collecteurs de métriques
 * @returns {Promise<void>}
 */
const setupCollectors = async () => {
  try {
    // Effectuer une première collecte immédiatement
    await collectAllMetrics();
    
    // Configurer la collecte périodique
    if (collectorInterval) {
      clearInterval(collectorInterval);
    }
    
    collectorInterval = setInterval(async () => {
      try {
        await collectAllMetrics();
      } catch (error) {
        logger.error(`Erreur dans l'intervalle de collecte: ${error.message}`);
      }
    }, COLLECTION_INTERVAL);
    
    logger.info(`Collecteurs de métriques configurés (intervalle: ${COLLECTION_INTERVAL}ms)`);
  } catch (error) {
    logger.error(`Échec de configuration des collecteurs: ${error.message}`);
    throw error;
  }
};

/**
 * Arrête les collecteurs de métriques
 */
const stopCollectors = () => {
  if (collectorInterval) {
    clearInterval(collectorInterval);
    collectorInterval = null;
    logger.info('Collecteurs de métriques arrêtés');
  }
};

module.exports = {
  setupCollectors,
  stopCollectors,
  collectAllMetrics,
  collectServiceMetrics
}; 