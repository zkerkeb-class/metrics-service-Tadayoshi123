const express = require('express');
const { 
  getCurrentServiceMetrics,
  getAllCurrentMetrics,
  getServiceMetricsHistory,
  forceCollectServiceMetrics,
  forceCollectAllMetrics,
  queryPrometheus,
  queryPrometheusRange
} = require('../controllers/MetricsController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Metrics
 *   description: Endpoints pour la récupération des métriques de santé des services.
 */

/**
 * @swagger
 * /api/v1/metrics:
 *   get:
 *     summary: Récupérer les métriques actuelles de tous les services
 *     tags: [Metrics]
 *     description: Retourne un tableau avec l'état et les dernières métriques collectées pour chaque service surveillé.
 *     responses:
 *       200:
 *         description: Liste des métriques par service.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceMetrics'
 */
router.get('/', getAllCurrentMetrics);

/**
 * @swagger
 * /api/v1/metrics/{serviceId}:
 *   get:
 *     summary: Récupérer les métriques d'un service spécifique
 *     tags: [Metrics]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID du service (ex: 'auth-service')."
 *     responses:
 *       200:
 *         description: Métriques du service demandé.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceMetrics'
 *       404:
 *         description: Service non trouvé.
 */
router.get('/:serviceId', getCurrentServiceMetrics);

/**
 * @swagger
 * /api/v1/metrics/{serviceId}/history:
 *   get:
 *     summary: Récupérer l'historique des métriques d'un service
 *     tags: [Metrics]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID du service.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de début (ISO 8601).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de fin (ISO 8601).
 *     responses:
 *       200:
 *         description: Un tableau de snapshots de métriques historiques.
 */
router.get('/:serviceId/history', getServiceMetricsHistory);

/**
 * @swagger
 * /api/v1/metrics/{serviceId}/collect:
 *   post:
 *     summary: Forcer la collecte pour un service spécifique
 *     tags: [Admin]
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collecte terminée.
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Droits admin requis.
 */
router.post('/:serviceId/collect', authenticate, authorize(['admin']), forceCollectServiceMetrics);

/**
 * @swagger
 * /api/v1/metrics/collect:
 *   post:
 *     summary: Forcer la collecte des métriques pour tous les services
 *     tags: [Admin]
 *     security:
 *       - AdminAuth: []
 *     description: "(Admin requis) Déclenche manuellement une passe de collecte des métriques sur tous les services configurés."
 *     responses:
 *       200:
 *         description: Collecte terminée avec succès.
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Droits admin requis.
 */
router.post('/collect', authenticate, authorize(['admin']), forceCollectAllMetrics);

/**
 * @swagger
 * /api/v1/metrics/prometheus/query:
 *   post:
 *     summary: Exécuter une requête PromQL instantanée
 *     tags: [Metrics, Prometheus]
 *     security:
 *       - bearerAuth: []
 *     description: Permet d'exécuter une requête PromQL instantanée directement sur Prometheus via le service de métriques. Ceci est utilisé par le frontend pour peupler les blocs de dashboard dynamiques.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: La requête PromQL à exécuter.
 *                 example: 'rate(http_requests_total{job="auth-service"}[5m])'
 *     responses:
 *       200:
 *         description: Résultat de la requête Prometheus.
 *       400:
 *         description: Requête invalide.
 *       401:
 *         description: Non authentifié.
 */
router.post('/prometheus/query', authenticate, queryPrometheus);

/**
 * @swagger
 * /api/v1/metrics/prometheus/query_range:
 *   post:
 *     summary: Exécuter une requête PromQL sur une période (range query)
 *     tags: [Metrics, Prometheus]
 *     security:
 *       - bearerAuth: []
 *     description: Permet d'exécuter une requête PromQL sur une période (range query) directement sur Prometheus. Utile pour les graphiques temporels.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: La requête PromQL à exécuter.
 *                 example: 'rate(http_requests_total{job="auth-service"}[5m])'
 *               start:
 *                 type: string
 *                 description: Timestamp de début (RFC3339 ou Unix timestamp).
 *                 example: '2023-10-27T10:00:00.000Z'
 *               end:
 *                 type: string
 *                 description: Timestamp de fin (RFC3339 ou Unix timestamp).
 *                 example: '2023-10-27T11:00:00.000Z'
 *               step:
 *                 type: string
 *                 description: Pas de temps de la requête (e.g., '15s', '1m', '1h').
 *                 example: '1m'
 *     responses:
 *       200:
 *         description: Résultat de la requête Prometheus.
 *       400:
 *         description: Requête invalide.
 *       401:
 *         description: Non authentifié.
 */
router.post('/prometheus/query_range', authenticate, queryPrometheusRange);

module.exports = router; 