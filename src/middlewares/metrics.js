const promClient = require('prom-client');
const { logger } = require('../config/logger');

// Créer un registre pour les métriques Prometheus
const register = new promClient.Registry();

// Ajouter les métriques par défaut
promClient.collectDefaultMetrics({
  register,
  prefix: 'metrics_service_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Compteur de requêtes HTTP
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// Histogramme des temps de réponse HTTP
const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// Compteur des erreurs de scraping
const scrapingErrorsTotal = new promClient.Counter({
  name: 'scraping_errors_total',
  help: 'Nombre total d\'erreurs de scraping',
  labelNames: ['service'],
  registers: [register]
});

// Jauge pour le statut des services
const serviceStatus = new promClient.Gauge({
  name: 'service_status',
  help: 'Statut des services (1 = up, 0 = down)',
  labelNames: ['service'],
  registers: [register]
});

// Jauge pour le temps de réponse des services
const serviceResponseTime = new promClient.Gauge({
  name: 'service_response_time_seconds',
  help: 'Temps de réponse des services en secondes',
  labelNames: ['service'],
  registers: [register]
});

// Compteur des alertes déclenchées
const alertsFiredTotal = new promClient.Counter({
  name: 'alerts_fired_total',
  help: 'Nombre total d\'alertes déclenchées',
  labelNames: ['service', 'severity', 'alert_name'],
  registers: [register]
});

/**
 * Middleware pour collecter les métriques de requêtes HTTP
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Fonction pour enregistrer les métriques à la fin de la requête
  const recordMetrics = () => {
    const responseTimeInSeconds = (Date.now() - start) / 1000;
    
    // Normaliser le chemin de la route pour éviter une explosion de cardinalité
    const route = req.route ? req.route.path : req.path;
    
    // Enregistrer les métriques
    httpRequestsTotal.inc({
      method: req.method,
      route,
      status: res.statusCode
    });
    
    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route,
        status: res.statusCode
      },
      responseTimeInSeconds
    );
  };
  
  // Intercepter la fin de la requête pour enregistrer les métriques
  res.on('finish', recordMetrics);
  
  next();
};

/**
 * Endpoint pour exposer les métriques Prometheus
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error(`Erreur lors de la génération des métriques: ${error.message}`);
    res.status(500).send('Erreur lors de la génération des métriques');
  }
};

/**
 * Fonction pour configurer les métriques dans l'application Express
 * @param {Object} app - Application Express
 */
const setupMetrics = (app) => {
  app.use(metricsMiddleware);
  app.get('/metrics', metricsEndpoint);
  logger.info('Métriques Prometheus configurées');
};

module.exports = {
  setupMetrics,
  register,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  scrapingErrorsTotal,
  serviceStatus,
  serviceResponseTime,
  alertsFiredTotal,
  metricsMiddleware,
  metricsEndpoint
}; 