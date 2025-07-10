// src/config/services.js

// Configuration des services à surveiller
const services = [
  {
    id: 'auth-service',
    name: 'Service d\'authentification',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    metricsPath: '/metrics',
    healthPath: '/health',
    description: 'Gestion de l\'authentification et des autorisations',
    tags: ['auth', 'security'],
    alertThresholds: {
      responseTime: 1000, // ms
      errorRate: 0.05, // 5%
      failedLogins: 10 // par minute
    }
  },
  {
    id: 'db-service',
    name: 'Service de base de données',
    url: process.env.DB_SERVICE_URL || 'http://localhost:3002',
    metricsPath: '/metrics',
    healthPath: '/health',
    description: 'Gestion des données et des requêtes',
    tags: ['database', 'storage'],
    alertThresholds: {
      responseTime: 500, // ms
      errorRate: 0.03, // 3%
      connectionPoolUsage: 0.8 // 80%
    }
  },
  {
    id: 'ai-service',
    name: 'Service d\'IA',
    url: process.env.AI_SERVICE_URL || 'http://localhost:3004',
    metricsPath: '/metrics',
    healthPath: '/api/health',
    description: 'Services d\'intelligence artificielle',
    tags: ['ai', 'ml'],
    alertThresholds: {
      responseTime: 2000, // ms
      errorRate: 0.05, // 5%
      modelLoadTime: 5000 // ms
    }
  },
  {
    id: 'payment-service',
    name: 'Service de paiement',
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
    metricsPath: '/metrics',
    healthPath: '/api/v1/health',
    description: 'Gestion des paiements et transactions',
    tags: ['payment', 'financial'],
    alertThresholds: {
      responseTime: 1000, // ms
      errorRate: 0.02, // 2%
      failedPayments: 0.05 // 5%
    }
  },
  {
    id: 'notifier-service',
    name: 'Service de notification',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
    metricsPath: '/metrics',
    healthPath: '/api/v1/health',
    description: 'Gestion des notifications email et SMS',
    tags: ['notification', 'communication'],
    alertThresholds: {
      responseTime: 800, // ms
      errorRate: 0.05, // 5%
      deliveryFailure: 0.1 // 10%
    }
  }
];

// Fonction pour obtenir un service par son ID
const getServiceById = (serviceId) => {
  return services.find(service => service.id === serviceId);
};

// Fonction pour obtenir tous les services
const getAllServices = () => {
  return services;
};

// Fonction pour obtenir les URLs des services pour le scraping Prometheus
const getServiceUrls = () => {
  return services.map(service => ({
    id: service.id,
    url: `${service.url}${service.metricsPath}`
  }));
};

module.exports = {
  services,
  getServiceById,
  getAllServices,
  getServiceUrls
}; 