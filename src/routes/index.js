// src/routes/index.js
const express = require('express');
const metricsRoutes = require('./metrics.routes');
const alertsRoutes = require('./alerts.routes');
const healthRoutes = require('./health.routes');

// Configurer les routes
const setupRoutes = (app) => {
  // API v1
  const apiRouter = express.Router();
  
  // Routes de métriques
  apiRouter.use('/metrics', metricsRoutes);
  
  // Routes d'alertes
  apiRouter.use('/alerts', alertsRoutes);
  
  // Monter le routeur API
  app.use('/api/v1', apiRouter);

  // Routes de santé (sans préfixe /api/v1)
  app.use('/', healthRoutes);
};

module.exports = { setupRoutes }; 