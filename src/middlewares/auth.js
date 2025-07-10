const jwt = require('jsonwebtoken');
const { AppError, ErrorCodes } = require('./errorHandler');
const { logger } = require('../config/logger');

// Middleware d'authentification pour les routes protégées
const authenticate = async (req, res, next) => {
  try {
    // Récupérer le token d'authentification
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token d\'authentification requis', 401, ErrorCodes.AUTHENTICATION_ERROR);
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new AppError('Token d\'authentification invalide', 401, ErrorCodes.AUTHENTICATION_ERROR);
    }
    
    // Vérifier le token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token expiré', 401, ErrorCodes.AUTHENTICATION_ERROR);
      }
      
      throw new AppError('Token invalide', 401, ErrorCodes.AUTHENTICATION_ERROR);
    }
  } catch (error) {
    next(error);
  }
};

// Middleware d'autorisation pour les rôles
const authorize = (requiredRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Utilisateur non authentifié', 401, ErrorCodes.AUTHENTICATION_ERROR);
      }
      
      const userRoles = req.user.roles || [];
      
      // Si aucun rôle n'est requis, autoriser
      if (!requiredRoles || requiredRoles.length === 0) {
        return next();
      }
      
      // Vérifier si l'utilisateur a au moins un des rôles requis
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        throw new AppError('Accès non autorisé', 403, ErrorCodes.AUTHORIZATION_ERROR);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware pour l'authentification des services
const authenticateService = async (req, res, next) => {
  try {
    // Récupérer le token d'authentification
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token d\'authentification de service requis', 401, ErrorCodes.AUTHENTICATION_ERROR);
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new AppError('Token d\'authentification de service invalide', 401, ErrorCodes.AUTHENTICATION_ERROR);
    }
    
    // Vérifier le token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Vérifier que c'est bien un token de service
      if (!decoded.service) {
        throw new AppError('Token invalide pour l\'authentification de service', 401, ErrorCodes.AUTHENTICATION_ERROR);
      }
      
      req.service = decoded.service;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token de service expiré', 401, ErrorCodes.AUTHENTICATION_ERROR);
      }
      
      throw new AppError('Token de service invalide', 401, ErrorCodes.AUTHENTICATION_ERROR);
    }
  } catch (error) {
    next(error);
  }
};

// Générer un token JWT pour les appels entre services
const generateServiceToken = (service) => {
  return jwt.sign(
    { service },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

module.exports = {
  authenticate,
  authorize,
  authenticateService,
  generateServiceToken
}; 