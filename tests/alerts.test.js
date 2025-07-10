const request = require('supertest');
const { app } = require('../src/server');
const redis = require('../src/config/redis');
const services = require('../src/config/services');
const alertService = require('../src/services/AlertService');

// Mock des dépendances
jest.mock('../src/config/redis');
jest.mock('../src/config/services');
jest.mock('../src/services/AlertService');

// Mock complet du middleware d'authentification
jest.mock('../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => next(),
  authorize: (roles) => (req, res, next) => next(),
  authenticateService: (req, res, next) => next(),
}));

// Mocks pour l'initialisation de bootstrap
jest.mock('../src/services/StorageService', () => ({ initStorage: jest.fn() }));
jest.mock('../src/services/CollectorService', () => ({ setupCollectors: jest.fn() }));

describe('Alerts Endpoints', () => {
  const mockService = { id: 'test-service', name: 'Test Service' };
  const mockAlert = {
    id: 'test-service:high_cpu',
    service: 'test-service',
    alertName: 'high_cpu',
    severity: 'critical',
    message: 'CPU usage is high',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/alerts', () => {
    test('doit retourner une liste vide si aucune alerte n\'est active', async () => {
      redis.getMetrics.mockResolvedValue(null);
      const response = await request(app).get('/api/v1/alerts');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.alerts).toEqual([]);
    });

    test('doit retourner les alertes actives depuis le cache', async () => {
      redis.getMetrics.mockResolvedValue({ [mockAlert.id]: mockAlert });
      const response = await request(app).get('/api/v1/alerts');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.alerts[0].id).toBe(mockAlert.id);
    });
  });

  describe('POST /api/v1/alerts', () => {
    test('doit créer une nouvelle alerte avec succès', async () => {
      services.getServiceById.mockReturnValue(mockService);
      alertService.triggerAlert.mockResolvedValue(mockAlert);

      const newAlertData = {
        service: 'test-service',
        alertName: 'high_cpu',
        severity: 'critical',
        message: 'CPU usage is high',
      };

      const response = await request(app)
        .post('/api/v1/alerts')
        .send(newAlertData);

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.alert.id).toBe(mockAlert.id);
      expect(alertService.triggerAlert).toHaveBeenCalledWith(
        expect.objectContaining(newAlertData)
      );
    });

    test('doit retourner une erreur 400 si des champs sont manquants', async () => {
      const response = await request(app)
        .post('/api/v1/alerts')
        .send({ service: 'test-service' }); // Champs manquants

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });

    test('doit retourner une erreur 404 si le service est inconnu', async () => {
      services.getServiceById.mockReturnValue(null);
      const newAlertData = {
        service: 'unknown-service',
        alertName: 'high_cpu',
        severity: 'critical',
        message: 'CPU usage is high',
      };
      
      const response = await request(app)
        .post('/api/v1/alerts')
        .send(newAlertData);

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('RESOURCE_NOT_FOUND');
    });
  });
}); 