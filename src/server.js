const express = require('express');
const { logger } = require('./config/logger');
const { setupMiddlewares } = require('./middlewares');
const { setupRoutes } = require('./routes');
const { setupErrorHandlers } = require('./middlewares/errorHandler');
const { setupCollectors } = require('./services/CollectorService');
const { initStorage } = require('./services/StorageService');
const { setupAlerts } = require('./services/AlertService');
const { initRedis } = require('./config/redis');

const app = express();

/**
 * Point d'entrée pour configurer l'application.
 */
const bootstrap = async () => {
  try {
    await initStorage();
    await initRedis();
    setupMiddlewares(app);
    setupRoutes(app);
    setupErrorHandlers(app);
    await setupCollectors();
    setupAlerts();
    logger.info('Application initialisée avec succès');
  } catch (error) {
    logger.error(`Échec de l'initialisation de l'application: ${error.message}`);
    process.exit(1);
  }
};

// Exécuter la configuration au démarrage
bootstrap();

// Démarrer le serveur si le fichier est exécuté directement
if (require.main === module) {
  const PORT = process.env.PORT || 3003;
  app.listen(PORT, () => {
    logger.info(`🚀 Serveur démarré sur le port ${PORT}`);
  });
}

module.exports = { app }; 