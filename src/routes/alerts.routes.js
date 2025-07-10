const express = require('express');
const AlertController = require('../controllers/AlertController');
const { authenticate, authorize, authenticateService } = require('../middlewares/auth');

const router = express.Router();
const alertController = new AlertController();

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: API pour consulter et gérer les alertes
 */

/**
 * @swagger
 * /api/v1/alerts:
 *   get:
 *     summary: Récupérer la liste des alertes
 *     tags: [Alerts]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: "Filtrer les alertes par ID de service."
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, error, critical]
 *         description: "Filtrer par sévérité."
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [firing, resolved]
 *           default: firing
 *         description: "Filtrer par statut."
 *     responses:
 *       200:
 *         description: Une liste d'alertes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Alert'
 */
router.get('/', alertController.getAlerts);

/**
 * @swagger
 * /api/v1/alerts/{alertId}:
 *   get:
 *     summary: Récupérer les détails d'une alerte spécifique
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Détails de l'alerte.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       404:
 *         description: Alerte non trouvée.
 */
router.get('/:alertId', alertController.getAlert);

/**
 * @swagger
 * /api/v1/alerts:
 *   post:
 *     summary: Créer une alerte manuellement
 *     tags: [Admin]
 *     security:
 *       - AdminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlertCreate'
 *     responses:
 *       201:
 *         description: Alerte créée.
 *       401:
 *         description: Authentification requise.
 */
router.post('/', authenticate, authorize(['admin']), alertController.createAlert);

/**
 * @swagger
 * /api/v1/alerts/service:
 *   post:
 *     summary: Endpoint pour les services internes pour déclencher une alerte
 *     tags: [Alerts]
 *     security:
 *       - ServiceAuth: []
 *     description: "Cet endpoint est utilisé par d'autres microservices pour signaler une alerte. Nécessite un token de service valide."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlertCreate'
 *     responses:
 *       201:
 *         description: Alerte reçue et traitée.
 *       401:
 *         description: Token de service invalide.
 */
router.post('/service', authenticateService, alertController.createAlert);

/**
 * @swagger
 * /api/v1/alerts/{alertId}/resolve:
 *   post:
 *     summary: Marquer une alerte comme résolue
 *     tags: [Admin]
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Alerte résolue.
 */
router.post('/:alertId/resolve', authenticate, authorize(['admin']), alertController.resolveAlertById);

module.exports = router;