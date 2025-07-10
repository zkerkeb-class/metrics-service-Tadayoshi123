const express = require('express');
const HealthController = require('../controllers/HealthController');

const router = express.Router();
const healthController = new HealthController();

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: "Endpoints pour la vérification de l'état de santé du service"
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Vérifie la santé globale du service et ses dépendances.
 *     tags: [Health]
 *     description: "Cet endpoint retourne un statut détaillé, incluant la connectivité à Redis et l'état des services surveillés. C'est l'endpoint le plus complet pour le health check."
 *     responses:
 *       200:
 *         description: Le service est sain.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 dependencies:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: 'Redis'
 *                       status:
 *                         type: string
 *                         example: 'UP'
 *       503:
 *         description: Le service ou l'une de ses dépendances est en panne.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/health', healthController.checkHealth);

/**
 * @swagger
 * /liveness:
 *   get:
 *     summary: Sonde de vivacité (liveness probe).
 *     tags: [Health]
 *     description: "Endpoint très léger pour les orchestrateurs (Kubernetes, Docker Swarm) afin de vérifier si le processus du service est en cours d'exécution. Retourne toujours 200 OK si le serveur HTTP répond."
 *     responses:
 *       200:
 *         description: Le service est en vie.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'live'
 */
router.get('/liveness', healthController.checkLiveness);

/**
 * @swagger
 * /readiness:
 *   get:
 *     summary: Sonde de préparation (readiness probe).
 *     tags: [Health]
 *     description: "Endpoint pour les orchestrateurs afin de vérifier si le service est prêt à accepter du trafic. Il vérifie les connexions critiques, comme celle à Redis."
 *     responses:
 *       200:
 *         description: Le service est prêt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'ready'
 *       503:
 *         description: Le service n'est pas prêt.
 */
router.get('/readiness', healthController.checkReadiness);

module.exports = router; 