const axios = require('axios');
const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');

/**
 * Client pour communiquer avec le service de notification SupervIA.
 */
class NotificationService {
  constructor() {
    this.baseURL = process.env.NOTIFICATION_SERVICE_URL;
    if (!this.baseURL) {
      logger.warn('NOTIFICATION_SERVICE_URL not set. Notification service calls will be disabled.');
    }
  }

  /**
   * Génère un token JWT pour l'authentification inter-services.
   * @returns {string} Le token JWT.
   */
  _generateServiceToken() {
    return jwt.sign(
      { serviceId: 'metrics-service', iss: 'metrics-service' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
  }

  /**
   * Envoie une requête au service de notification.
   * @param {string} endpoint - Le chemin de l'API à appeler.
   * @param {object} data - Les données à envoyer dans le corps de la requête.
   * @returns {Promise<object>} La réponse de l'API.
   */
  async _sendRequest(endpoint, data) {
    if (!this.baseURL) {
      return;
    }

    try {
      const token = this._generateServiceToken();
      const response = await axios.post(`${this.baseURL}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      logger.error(`Error calling notification service at ${endpoint}: ${errorMessage}`);
    }
  }

  /**
   * Envoie une notification d'alerte par e-mail.
   * @param {object} alert - L'objet d'alerte.
   */
  async sendAlertEmail(alert) {
    const { service, alertName, severity, message, value, threshold } = alert;
    const recipient = process.env.ALERT_RECIPIENT_EMAIL || 'admin@supervia.com';
    
    // Construire le contenu HTML pour les détails de l'alerte
    const alert_details_html = `
      <p><strong>Service :</strong> ${service}</p>
      <p><strong>Alerte :</strong> ${alertName}</p>
      <p><strong>Sévérité :</strong> ${severity.toUpperCase()}</p>
      <p><strong>Message :</strong> ${message}</p>
      <p><strong>Valeur Actuelle :</strong> ${value}</p>
      <p><strong>Seuil :</strong> ${threshold}</p>
    `;

    return this._sendRequest('/api/v1/send-email', {
      to: recipient,
      subject: `[${severity.toUpperCase()}] Alerte SupervIA pour ${service}`,
      template: 'alert', // Utilisation du nouveau template
      context: {
        title: `Alerte: ${alertName}`,
        alert_details: alert_details_html,
        dashboard_link: `${process.env.FRONTEND_URL}/dashboard/alerts`,
        currentYear: new Date().getFullYear()
      },
    });
  }

  /**
   * Diffuse une notification d'alerte via WebSocket.
   * @param {object} alert - L'objet d'alerte.
   */
  async broadcastAlert(alert) {
    return this._sendRequest('/api/v1/ws/broadcast', {
      event: 'new_alert',
      data: alert,
    });
  }

  /**
   * Diffuse une notification de résolution d'alerte via WebSocket.
   * @param {object} alert - L'objet d'alerte résolue.
   */
  async broadcastAlertResolution(alert) {
    return this._sendRequest('/api/v1/ws/broadcast', {
      event: 'alert_resolved',
      data: alert,
    });
  }
}

module.exports = new NotificationService(); 