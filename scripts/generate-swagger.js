require('dotenv').config();
const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SupervIA Metrics & Alerting Service API',
      version: packageJson.version || '1.0.0',
      description: "API pour la collecte, la consultation et l'alerting des métriques de l'écosystème SupervIA. Ce service communique avec Prometheus et les autres microservices.",
      contact: {
        name: 'SupervIA Team',
        email: 'contact@supervia.com'
      },
      license: {
        name: 'MIT',
        url: 'https://github.com/zkerkeb-class/metrics-service-Tadayoshi123/blob/main/LICENSE'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3003}`,
        description: 'Serveur de développement'
      }
    ],
    components: {
      securitySchemes: {
        AdminAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: "Token JWT pour un utilisateur avec le rôle 'admin', requis pour les opérations de modification (forcer la collecte, résoudre des alertes, etc.)."
        },
        ServiceAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: "Token JWT pour l'authentification inter-services, utilisé par les autres services pour soumettre des alertes par exemple."
        }
      },
      schemas: {
        ApiError: {
            type: 'object',
            properties: {
                success: {
                    type: 'boolean',
                    example: false
                },
                errorCode: {
                    type: 'string',
                    example: 'NOT_FOUND'
                },
                message: {
                    type: 'string'
                }
            }
        },
        Metric: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nom de la métrique (ex: cpu_usage).' },
            value: { type: 'number', description: 'Valeur actuelle de la métrique.' },
            type: { type: 'string', enum: ['gauge', 'counter'], description: 'Type de métrique.' },
            help: { type: 'string', description: 'Description de la métrique.' },
            labels: { type: 'object', description: 'Labels additionnels.' }
          }
        },
        ServiceMetrics: {
          type: 'object',
          properties: {
            serviceId: { type: 'string' },
            status: { type: 'string', enum: ['UP', 'DOWN', 'UNKNOWN'] },
            lastSeen: { type: 'string', format: 'date-time' },
            metrics: {
              type: 'array',
              items: { $ref: '#/components/schemas/Metric' }
            }
          }
        },
        Alert: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            service: { type: 'string', description: 'ID du service concerné.' },
            alertName: { type: 'string', description: 'Nom de la règle d\'alerte.' },
            severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
            message: { type: 'string', description: 'Message d\'alerte.' },
            status: { type: 'string', enum: ['firing', 'resolved'] },
            value: { type: 'number', description: 'Valeur qui a déclenché l\'alerte.' },
            threshold: { type: 'number', description: 'Seuil qui a été dépassé.' },
            firedAt: { type: 'string', format: 'date-time' },
            resolvedAt: { type: 'string', format: 'date-time' }
          }
        },
        AlertCreate: {
          type: 'object',
          required: ['service', 'alertName', 'severity', 'message'],
          properties: {
            service: { type: 'string' },
            alertName: { type: 'string' },
            severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
            message: { type: 'string' },
            value: { type: 'number' },
            threshold: { type: 'number' }
          }
        }
      }
    },
    tags: [
        { name: 'Health', description: 'Endpoints de santé et de statut du service.' },
        { name: 'Metrics', description: 'Endpoints pour la consultation des métriques des services.' },
        { name: 'Alerts', description: 'Endpoints pour la gestion des alertes.' },
        { name: 'Admin', description: 'Endpoints administratifs (protégés).' },
    ]
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(swaggerOptions);
const outputPath = path.join(__dirname, '../src/swagger.json');

fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2));

console.log(`✅ Documentation Swagger générée avec succès : ${outputPath}`); 