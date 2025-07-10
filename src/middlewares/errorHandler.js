const { logger } = require('../config/logger');

// Classe d'erreur personnalisée
class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.errorCode = errorCode || 'INTERNAL_SERVER_ERROR';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Codes d'erreur
const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  SCRAPING_ERROR: 'SCRAPING_ERROR',
  ALERT_ERROR: 'ALERT_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR'
};

// Middleware de gestion des erreurs
const errorHandler = (err, req, res, next) => {
  // Erreurs opérationnelles connues
  if (err.isOperational) {
    logger.warn(`Erreur opérationnelle: ${err.message}`, {
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      path: req.path
    });

    return res.status(err.statusCode).json({
      success: false,
      errorCode: err.errorCode,
      message: err.message
    });
  }

  // Erreurs de validation Joi
  if (err.isJoi) {
    logger.warn(`Erreur de validation: ${err.message}`, {
      path: req.path,
      details: err.details
    });

    return res.status(400).json({
      success: false,
      errorCode: ErrorCodes.VALIDATION_ERROR,
      message: 'Erreur de validation des données',
      details: err.details.map(detail => ({
        message: detail.message,
        path: detail.path
      }))
    });
  }

  // Erreurs non gérées
  logger.error(`Erreur non gérée: ${err.message}`, {
    stack: err.stack,
    path: req.path
  });

  // En développement, renvoyer la stack trace
  const errorResponse = {
    success: false,
    errorCode: ErrorCodes.INTERNAL_SERVER_ERROR,
    message: process.env.NODE_ENV === 'production'
      ? 'Une erreur interne est survenue'
      : err.message
  };

  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  return res.status(500).json(errorResponse);
};

// Middleware pour les routes non trouvées
const notFoundHandler = (req, res) => {
  logger.warn(`Route non trouvée: ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    errorCode: ErrorCodes.RESOURCE_NOT_FOUND,
    message: `La route ${req.originalUrl} n'existe pas`
  });
};

/**
 * Configure les gestionnaires d'erreurs pour l'application
 * @param {Object} app - Application Express
 */
const setupErrorHandlers = (app) => {
  // Le gestionnaire 404 doit être après toutes les routes
  app.use(notFoundHandler);

  // Le gestionnaire d'erreurs doit être le dernier middleware
  app.use(errorHandler);
};

module.exports = {
  AppError,
  ErrorCodes,
  errorHandler,
  notFoundHandler,
  setupErrorHandlers,
}; 