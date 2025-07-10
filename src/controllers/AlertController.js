const { logger } = require('../config/logger');
const { getMetrics } = require('../config/redis');
const { getServiceById } = require('../config/services');
const { triggerAlert, resolveAlert, getActiveAlerts, SeverityLevels } = require('../services/AlertService');
const { AppError, ErrorCodes } = require('../middlewares/errorHandler');

// Récupérer toutes les alertes actives
const getAlerts = async (req, res, next) => {
  try {
    // Récupérer les alertes depuis Redis
    const alerts = await getMetrics('alerts:active');
    
    if (!alerts) {
      return res.json({
        success: true,
        alerts: []
      });
    }
    
    // Convertir l'objet en tableau
    const alertsArray = Object.values(alerts);
    
    // Filtrer par service si spécifié
    const { serviceId } = req.query;
    const filteredAlerts = serviceId
      ? alertsArray.filter(alert => alert.service === serviceId)
      : alertsArray;
    
    // Filtrer par sévérité si spécifié
    const { severity } = req.query;
    const severityFilteredAlerts = severity
      ? filteredAlerts.filter(alert => alert.severity === severity)
      : filteredAlerts;
    
    return res.json({
      success: true,
      count: severityFilteredAlerts.length,
      alerts: severityFilteredAlerts
    });
  } catch (error) {
    next(error);
  }
};

// Récupérer une alerte spécifique
const getAlert = async (req, res, next) => {
  try {
    const { alertId } = req.params;
    
    // Récupérer l'alerte depuis Redis
    const alert = await getMetrics(`alerts:${alertId}`);
    
    if (!alert) {
      throw new AppError(`Alerte non trouvée: ${alertId}`, 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }
    
    return res.json({
      success: true,
      alert
    });
  } catch (error) {
    next(error);
  }
};

// Créer une alerte manuelle
const createAlert = async (req, res, next) => {
  try {
    const { service, alertName, severity, message, value, threshold } = req.body;
    
    // Valider les données
    if (!service || !alertName || !severity || !message) {
      throw new AppError('Les champs service, alertName, severity et message sont requis', 400, ErrorCodes.VALIDATION_ERROR);
    }
    
    // Vérifier si le service existe
    const serviceObj = getServiceById(service);
    if (!serviceObj) {
      throw new AppError(`Service inconnu: ${service}`, 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }
    
    // Vérifier la sévérité
    if (!Object.values(SeverityLevels).includes(severity)) {
      throw new AppError(`Sévérité invalide: ${severity}`, 400, ErrorCodes.VALIDATION_ERROR);
    }
    
    // Créer l'alerte
    const alert = await triggerAlert({
      service,
      alertName,
      severity,
      message,
      value: value || null,
      threshold: threshold || null
    });
    
    return res.status(201).json({
      success: true,
      alert
    });
  } catch (error) {
    next(error);
  }
};

// Résoudre une alerte
const resolveAlertById = async (req, res, next) => {
  try {
    const { alertId } = req.params;
    
    // Résoudre l'alerte
    const success = await resolveAlert(alertId);
    
    if (!success) {
      throw new AppError(`Impossible de résoudre l'alerte: ${alertId}`, 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }
    
    return res.json({
      success: true,
      message: `Alerte ${alertId} résolue avec succès`
    });
  } catch (error) {
    next(error);
  }
};

// Résoudre toutes les alertes d'un service
const resolveServiceAlerts = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    
    // Vérifier si le service existe
    const service = getServiceById(serviceId);
    if (!service) {
      throw new AppError(`Service inconnu: ${serviceId}`, 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }
    
    // Récupérer les alertes actives
    const activeAlerts = getActiveAlerts();
    
    // Filtrer les alertes du service
    const serviceAlerts = Object.entries(activeAlerts)
      .filter(([_, alert]) => alert.service === serviceId)
      .map(([id]) => id);
    
    if (serviceAlerts.length === 0) {
      return res.json({
        success: true,
        message: `Aucune alerte active pour le service ${serviceId}`
      });
    }
    
    // Résoudre chaque alerte
    const results = await Promise.all(
      serviceAlerts.map(async (alertId) => {
        try {
          return await resolveAlert(alertId);
        } catch (error) {
          logger.error(`Erreur lors de la résolution de l'alerte ${alertId}: ${error.message}`);
          return false;
        }
      })
    );
    
    // Compter les alertes résolues
    const resolvedCount = results.filter(Boolean).length;
    
    return res.json({
      success: true,
      message: `${resolvedCount}/${serviceAlerts.length} alertes résolues pour le service ${serviceId}`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlerts,
  getAlert,
  createAlert,
  resolveAlertById,
  resolveServiceAlerts
}; 