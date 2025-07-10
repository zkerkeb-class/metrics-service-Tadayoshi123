const axios = require('axios');
const cron = require('node-cron');
const { logger } = require('../config/logger');
const { storeMetrics, getMetrics } = require('../config/redis');
const { alertsFiredTotal } = require('../middlewares/metrics');
const { getAllServices } = require('../config/services');
const notificationService = require('./notification.service');

// Définition des niveaux de sévérité
const SeverityLevels = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Liste des alertes actives
let activeAlerts = {};

// Déclencher une alerte
const triggerAlert = async (alertData) => {
  const { service, alertName, severity, message, value, threshold } = alertData;
  
  // Créer un ID unique pour l'alerte
  const alertId = `${service}:${alertName}`;
  
  // Vérifier si l'alerte est déjà active
  const isNewAlert = !activeAlerts[alertId];
  
  // Mettre à jour l'alerte active
  activeAlerts[alertId] = {
    id: alertId,
    service,
    alertName,
    severity,
    message,
    value,
    threshold,
    firstTriggeredAt: isNewAlert ? new Date() : activeAlerts[alertId].firstTriggeredAt,
    lastTriggeredAt: new Date(),
    count: isNewAlert ? 1 : activeAlerts[alertId].count + 1
  };
  
  // Incrémenter le compteur d'alertes
  alertsFiredTotal.inc({
    service,
    severity,
    alert_name: alertName
  });
  
  // Stocker l'alerte dans Redis
  await storeMetrics(`alerts:${alertId}`, activeAlerts[alertId]);
  
  // Ajouter l'alerte à la liste des alertes actives
  await storeMetrics('alerts:active', activeAlerts);
  
  // Envoyer une notification si c'est une nouvelle alerte ou si la sévérité est critique
  if (isNewAlert || severity === SeverityLevels.CRITICAL) {
    await sendAlertNotification(activeAlerts[alertId]);
  }
  
  logger.warn(`Alerte déclenchée: [${severity.toUpperCase()}] ${service} - ${message}`);
  
  return activeAlerts[alertId];
};

// Résoudre une alerte
const resolveAlert = async (alertId) => {
  // Vérifier si l'alerte existe
  if (!activeAlerts[alertId]) {
    logger.warn(`Tentative de résolution d'une alerte inexistante: ${alertId}`);
    return false;
  }
  
  const alert = { ...activeAlerts[alertId] };
  
  // Supprimer l'alerte de la liste des alertes actives
  delete activeAlerts[alertId];
  
  // Mettre à jour la liste des alertes actives dans Redis
  await storeMetrics('alerts:active', activeAlerts);
  
  // Stocker l'alerte résolue dans l'historique
  alert.resolvedAt = new Date();
  await storeMetrics(`alerts:history:${alertId}:${Date.now()}`, alert);
  
  // Envoyer une notification de résolution
  await sendAlertResolutionNotification(alert);
  
  logger.info(`Alerte résolue: ${alertId}`);
  
  return true;
};

// Vérifier les métriques pour résoudre automatiquement les alertes
const checkMetricsForAlertResolution = async () => {
  // Récupérer les services
  const services = getAllServices();
  
  // Pour chaque service, vérifier les métriques
  for (const service of services) {
    // Récupérer les dernières métriques du service
    const metrics = await getMetrics(`metrics:${service.id}:latest`);
    
    if (!metrics) continue;
    
    // Vérifier les alertes de temps de réponse
    const responseTimeAlertId = `${service.id}:high_response_time`;
    if (
      activeAlerts[responseTimeAlertId] &&
      metrics.status === 'up' &&
      metrics.responseTime <= service.alertThresholds.responseTime / 1000
    ) {
      await resolveAlert(responseTimeAlertId);
    }
    
    // Vérifier les alertes de disponibilité
    const availabilityAlertId = `${service.id}:service_unavailable`;
    if (
      activeAlerts[availabilityAlertId] &&
      metrics.status === 'up'
    ) {
      await resolveAlert(availabilityAlertId);
    }
  }
};

// Envoyer une notification d'alerte
const sendAlertNotification = async (alert) => {
  try {
    // Envoyer une notification par e-mail et une via WebSocket
    await Promise.all([
      notificationService.sendAlertEmail(alert),
      notificationService.broadcastAlert(alert)
    ]);
    
    logger.info(`Notification d'alerte envoyée pour: ${alert.id}`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de l'envoi de la notification d'alerte: ${error.message}`);
    return false;
  }
};

// Envoyer une notification de résolution d'alerte
const sendAlertResolutionNotification = async (alert) => {
  try {
    // Envoyer une notification par e-mail et une via WebSocket
    await notificationService.broadcastAlertResolution(alert);
    
    logger.info(`Notification de résolution d'alerte envoyée pour: ${alert.id}`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de l'envoi de la notification de résolution d'alerte: ${error.message}`);
    return false;
  }
};

// Configurer les vérifications périodiques pour la résolution des alertes
const setupAlerts = () => {
  // Vérifier toutes les minutes si des alertes peuvent être résolues
  cron.schedule('* * * * *', async () => {
    try {
      await checkMetricsForAlertResolution();
    } catch (error) {
      logger.error(`Erreur lors de la vérification des métriques pour la résolution des alertes: ${error.message}`);
    }
  });
  
  logger.info('Système d\'alertes configuré');
};

module.exports = {
  SeverityLevels,
  triggerAlert,
  resolveAlert,
  setupAlerts,
  getActiveAlerts: () => activeAlerts
}; 