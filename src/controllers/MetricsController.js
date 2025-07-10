const { logger } = require('../config/logger');
const { getMetrics } = require('../config/redis');
const { getServiceById, getAllServices } = require('../config/services');
const { collectServiceMetrics, collectAllMetrics } = require('../services/CollectorService');
const { getServiceMetricsForPeriod } = require('../services/StorageService');
const { AppError, ErrorCodes } = require('../middlewares/errorHandler');
const { executeQuery, executeRangeQuery } = require('../services/prometheus.service');

// Récupérer les métriques actuelles d'un service
const getCurrentServiceMetrics = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    
    // Vérifier si le service existe
    const service = getServiceById(serviceId);
    if (!service) {
      throw new AppError(`Service inconnu: ${serviceId}`, 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }
    
    // Récupérer les métriques depuis Redis
    const metrics = await getMetrics(`metrics:${serviceId}:latest`);
    
    if (!metrics) {
      // Si les métriques ne sont pas en cache, les collecter
      logger.info(`Métriques non trouvées dans le cache pour ${serviceId}, collecte en cours...`);
      const freshMetrics = await collectServiceMetrics(serviceId);
      
      if (!freshMetrics) {
        throw new AppError(`Impossible de collecter les métriques pour ${serviceId}`, 503, ErrorCodes.SERVICE_UNAVAILABLE);
      }
      
      return res.json({
        success: true,
        service: service,
        metrics: freshMetrics
      });
    }
    
    return res.json({
      success: true,
      service: service,
      metrics: metrics
    });
  } catch (error) {
    next(error);
  }
};

// Récupérer les métriques actuelles de tous les services
const getAllCurrentMetrics = async (req, res, next) => {
  try {
    // Récupérer les métriques depuis Redis
    const metrics = await getMetrics('metrics:all:latest');
    
    if (!metrics) {
      // Si les métriques ne sont pas en cache, les collecter
      logger.info('Métriques non trouvées dans le cache, collecte en cours...');
      const freshMetrics = await collectAllMetrics();
      
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        services: getAllServices().map(service => ({
          ...service,
          metrics: freshMetrics[service.id]
        }))
      });
    }
    
    return res.json({
      success: true,
      ...metrics
    });
  } catch (error) {
    next(error);
  }
};

// Récupérer l'historique des métriques d'un service
const getServiceMetricsHistory = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Vérifier si le service existe
    const service = getServiceById(serviceId);
    if (!service) {
      throw new AppError(`Service inconnu: ${serviceId}`, 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }
    
    // Valider les dates
    if (!startDate || !endDate) {
      throw new AppError('Les paramètres startDate et endDate sont requis', 400, ErrorCodes.VALIDATION_ERROR);
    }
    
    // Récupérer les métriques
    const metrics = await getServiceMetricsForPeriod(
      serviceId,
      new Date(startDate),
      new Date(endDate)
    );
    
    return res.json({
      success: true,
      service: service,
      startDate,
      endDate,
      count: metrics.length,
      metrics: metrics
    });
  } catch (error) {
    next(error);
  }
};

// Forcer la collecte des métriques d'un service
const forceCollectServiceMetrics = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    
    // Vérifier si le service existe
    const service = getServiceById(serviceId);
    if (!service) {
      throw new AppError(`Service inconnu: ${serviceId}`, 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }
    
    // Collecter les métriques
    const metrics = await collectServiceMetrics(serviceId);
    
    if (!metrics) {
      throw new AppError(`Impossible de collecter les métriques pour ${serviceId}`, 503, ErrorCodes.SERVICE_UNAVAILABLE);
    }
    
    return res.json({
      success: true,
      service: service,
      metrics: metrics
    });
  } catch (error) {
    next(error);
  }
};

// Forcer la collecte des métriques de tous les services
const forceCollectAllMetrics = async (req, res, next) => {
  try {
    // Collecter les métriques
    const metrics = await collectAllMetrics();
    
    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      services: getAllServices().map(service => ({
        ...service,
        metrics: metrics[service.id]
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Exécute une requête PromQL instantanée.
 */
const queryPrometheus = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) {
      throw new AppError('Le paramètre "query" est requis dans le corps de la requête.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const result = await executeQuery(query);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Exécute une requête PromQL sur une période.
 */
const queryPrometheusRange = async (req, res, next) => {
  try {
    const { query, start, end, step } = req.body;
    if (!query || !start || !end || !step) {
      throw new AppError('Les paramètres "query", "start", "end", et "step" sont requis.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const result = await executeRangeQuery(query, start, end, step);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentServiceMetrics,
  getAllCurrentMetrics,
  getServiceMetricsHistory,
  forceCollectServiceMetrics,
  forceCollectAllMetrics,
  queryPrometheus,
  queryPrometheusRange
}; 