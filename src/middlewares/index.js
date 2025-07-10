const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { logger } = require('../config/logger');
const { setupMetrics } = require('./metrics');

/**
 * Configure les middlewares de base de l'application
 * @param {Object} app - Application Express
 */
const setupMiddlewares = (app) => {
  // Sécurité
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Requis pour Swagger UI
        styleSrc: ["'self'", "'unsafe-inline'"],  // Requis pour Swagger UI
        imgSrc: ["'self'", "data:"],
      },
    },
  }));

  // Compression
  app.use(compression());

  // CORS
  const corsOptions = {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
  app.use(cors(corsOptions));

  // Logging HTTP
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (message) => logger.info(message.trim()) },
    skip: (req, res) => (req.path === '/metrics' || req.path === '/health'),
  }));
  
  // Configuration des métriques Prometheus
  setupMetrics(app);

  // Parsing du corps des requêtes
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  
  // Swagger UI
  try {
    const swaggerDocument = require('../swagger.json');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (error) {
    logger.warn('Fichier swagger.json non trouvé. La documentation API sera indisponible.');
  }
};

module.exports = { setupMiddlewares }; 