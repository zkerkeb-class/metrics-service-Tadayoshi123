const { logger } = require('../config/logger');
const { getMetrics, storeMetrics, deleteMetrics } = require('../config/redis');
const fs = require('fs').promises;
const path = require('path');

// Répertoire de stockage des métriques
const METRICS_DIR = path.join(process.cwd(), 'data', 'metrics');

// Assurer que le répertoire existe
const ensureDirectoryExists = async (directory) => {
  try {
    await fs.mkdir(directory, { recursive: true });
    return true;
  } catch (error) {
    if (error.code !== 'EEXIST') {
      logger.error(`Erreur lors de la création du répertoire ${directory}: ${error.message}`);
      throw error;
    }
    return true;
  }
};

// Initialiser le stockage
const initStorage = async () => {
  try {
    await ensureDirectoryExists(METRICS_DIR);
    logger.info(`Stockage des métriques initialisé dans ${METRICS_DIR}`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de l'initialisation du stockage: ${error.message}`);
    throw error; // Propager l'erreur pour une meilleure gestion
  }
};

// Stocker les métriques d'un service
const storeServiceMetrics = async (serviceId, metrics) => {
  try {
    if (!serviceId || !metrics) {
      throw new Error('serviceId et metrics sont requis');
    }
    
    // Créer le répertoire pour le service s'il n'existe pas
    const serviceDir = path.join(METRICS_DIR, serviceId);
    await ensureDirectoryExists(serviceDir);
    
    // Créer un nom de fichier basé sur la date
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    
    // Créer le répertoire pour la date
    const dateDir = path.join(serviceDir, `${year}-${month}-${day}`);
    await ensureDirectoryExists(dateDir);
    
    // Nom du fichier
    const filename = `${hour}-${minute}.json`;
    const filePath = path.join(dateDir, filename);
    
    // Ajouter un timestamp aux métriques si non présent
    if (!metrics.timestamp) {
      metrics.timestamp = date.toISOString();
    }
    
    // Écrire les métriques dans le fichier
    await fs.writeFile(filePath, JSON.stringify(metrics, null, 2));
    
    // Stocker le chemin du fichier dans Redis pour un accès rapide
    const filesKey = `metrics:${serviceId}:files`;
    const cachedFiles = await getMetrics(filesKey) || [];
    
    // Ajouter le nouveau fichier et garder les 1000 derniers
    cachedFiles.unshift({
      path: filePath,
      timestamp: metrics.timestamp,
      size: JSON.stringify(metrics).length
    });
    
    if (cachedFiles.length > 1000) {
      cachedFiles.length = 1000;
    }
    
    // Mettre à jour le cache Redis avec une expiration de 7 jours
    await storeMetrics(filesKey, cachedFiles, 7 * 24 * 60 * 60);
    
    // Stocker également les métriques les plus récentes dans Redis pour un accès rapide
    const latestKey = `metrics:${serviceId}:latest`;
    await storeMetrics(latestKey, metrics, 3600); // Expire après 1 heure
    
    logger.debug(`Métriques stockées pour ${serviceId} dans ${filePath}`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors du stockage des métriques pour ${serviceId}: ${error.message}`);
    return false;
  }
};

// Récupérer les métriques d'un service pour une période donnée
const getServiceMetricsForPeriod = async (serviceId, startDate, endDate) => {
  try {
    if (!serviceId) {
      throw new Error('serviceId est requis');
    }
    
    // Vérifier si nous avons besoin des métriques les plus récentes uniquement
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Si la période demandée est récente (moins de 5 minutes), essayer d'abord Redis
    if ((!startDate || new Date(startDate) >= fiveMinutesAgo) && 
        (!endDate || new Date(endDate) >= now)) {
      const latestKey = `metrics:${serviceId}:latest`;
      const latestMetrics = await getMetrics(latestKey);
      
      if (latestMetrics) {
        logger.debug(`Métriques récentes récupérées depuis Redis pour ${serviceId}`);
        return [latestMetrics];
      }
    }
    
    // Convertir les dates en objets Date si nécessaire
    const start = startDate ? (startDate instanceof Date ? startDate : new Date(startDate)) : new Date(0);
    const end = endDate ? (endDate instanceof Date ? endDate : new Date(endDate)) : new Date();
    
    // Vérifier si nous avons les chemins de fichiers dans Redis
    const filesKey = `metrics:${serviceId}:files`;
    const cachedFiles = await getMetrics(filesKey);
    
    if (cachedFiles && Array.isArray(cachedFiles)) {
      // Filtrer les fichiers par date
      const filteredFiles = cachedFiles.filter(file => {
        if (!file.timestamp) return false;
        const fileDate = new Date(file.timestamp);
        return fileDate >= start && fileDate <= end;
      });
      
      if (filteredFiles.length > 0) {
        // Lire les fichiers filtrés
        const metrics = [];
        for (const file of filteredFiles) {
          try {
            const fileContent = await fs.readFile(file.path, 'utf8');
            metrics.push(JSON.parse(fileContent));
          } catch (error) {
            // Si le fichier n'existe pas, continuer
            if (error.code === 'ENOENT') {
              logger.warn(`Fichier de métriques non trouvé: ${file.path}`);
              continue;
            }
            throw error;
          }
        }
        
        // Trier les métriques par date
        metrics.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return metrics;
      }
    }
    
    // Si nous n'avons pas trouvé les métriques dans Redis, chercher dans les fichiers
    // Générer la liste des jours entre les deux dates
    const days = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      
      days.push(`${year}-${month}-${day}`);
      
      // Passer au jour suivant
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Récupérer les métriques pour chaque jour
    const metrics = [];
    
    for (const day of days) {
      const dayDir = path.join(METRICS_DIR, serviceId, day);
      
      try {
        // Vérifier si le répertoire existe
        await fs.access(dayDir);
        
        // Lister les fichiers dans le répertoire
        const files = await fs.readdir(dayDir);
        
        // Lire chaque fichier
        for (const file of files) {
          const filePath = path.join(dayDir, file);
          const fileContent = await fs.readFile(filePath, 'utf8');
          const fileMetrics = JSON.parse(fileContent);
          
          // Vérifier si les métriques sont dans la période demandée
          const metricsDate = new Date(fileMetrics.timestamp);
          
          if (metricsDate >= start && metricsDate <= end) {
            metrics.push(fileMetrics);
          }
        }
      } catch (error) {
        // Si le répertoire n'existe pas, continuer
        if (error.code === 'ENOENT') {
          continue;
        }
        
        throw error;
      }
    }
    
    // Trier les métriques par date
    metrics.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return metrics;
  } catch (error) {
    logger.error(`Erreur lors de la récupération des métriques pour ${serviceId}: ${error.message}`);
    return [];
  }
};

// Nettoyer les anciennes métriques
const cleanupOldMetrics = async (daysToKeep = 30) => {
  try {
    // Calculer la date limite
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - daysToKeep);
    
    // Lister les services
    const services = await fs.readdir(METRICS_DIR);
    let deletedCount = 0;
    
    for (const serviceId of services) {
      const serviceDir = path.join(METRICS_DIR, serviceId);
      
      // Lister les jours
      const days = await fs.readdir(serviceDir);
      
      for (const day of days) {
        // Convertir le jour en date
        const [year, month, dayOfMonth] = day.split('-').map(Number);
        const dayDate = new Date(year, month - 1, dayOfMonth);
        
        // Supprimer si plus ancien que la limite
        if (dayDate < limitDate) {
          const dayDir = path.join(serviceDir, day);
          await fs.rm(dayDir, { recursive: true, force: true });
          logger.info(`Métriques anciennes supprimées: ${dayDir}`);
          deletedCount++;
          
          // Mettre à jour le cache Redis
          const filesKey = `metrics:${serviceId}:files`;
          const cachedFiles = await getMetrics(filesKey) || [];
          const updatedFiles = cachedFiles.filter(file => !file.path.includes(day));
          
          if (updatedFiles.length !== cachedFiles.length) {
            await storeMetrics(filesKey, updatedFiles, 7 * 24 * 60 * 60);
          }
        }
      }
    }
    
    logger.info(`Nettoyage des métriques anciennes terminé (${deletedCount} répertoires supprimés, conservation de ${daysToKeep} jours)`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors du nettoyage des métriques anciennes: ${error.message}`);
    return false;
  }
};

module.exports = {
  initStorage,
  storeServiceMetrics,
  getServiceMetricsForPeriod,
  cleanupOldMetrics
}; 