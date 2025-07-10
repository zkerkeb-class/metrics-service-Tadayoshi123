const request = require('supertest');
const { app } = require('../src/server');
const redis = require('../src/config/redis');
const collector = require('../src/services/CollectorService');
const services = require('../src/config/services');

// Mock des dépendances
jest.mock('../src/config/redis');
jest.mock('../src/services/CollectorService');
jest.mock('../src/config/services');

// Mocks pour l'initialisation de bootstrap
jest.mock('../src/services/StorageService', () => ({ initStorage: jest.fn() }));
jest.mock('../src/services/AlertService', () => ({ setupAlerts: jest.fn() }));

describe('Metrics Endpoints', () => {
  const mockService = { id: 'test-service', name: 'Test Service' };
  const mockMetrics = {
    timestamp: new Date().toISOString(),
    status: 'up',
    responseTime: 0.1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/metrics', () => {
    test('doit retourner les métriques de tous les services depuis le cache', async () => {
      const cachedData = {
        timestamp: new Date().toISOString(),
        services: [{ ...mockService, metrics: mockMetrics }],
      };
      redis.getMetrics.mockResolvedValue(cachedData);

      const response = await request(app).get('/api/v1/metrics');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.services[0].id).toBe('test-service');
      expect(redis.getMetrics).toHaveBeenCalledWith('metrics:all:latest');
      expect(collector.collectAllMetrics).not.toHaveBeenCalled();
    });

    test('doit collecter les métriques si le cache est vide', async () => {
      redis.getMetrics.mockResolvedValue(null);
      collector.collectAllMetrics.mockResolvedValue({ 'test-service': mockMetrics });
      services.getAllServices.mockReturnValue([mockService]);

      const response = await request(app).get('/api/v1/metrics');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(collector.collectAllMetrics).toHaveBeenCalled();
      expect(response.body.services[0].metrics.status).toBe('up');
    });
  });

  describe('GET /api/v1/metrics/:serviceId', () => {
    test('doit retourner les métriques pour un service spécifique depuis le cache', async () => {
      services.getServiceById.mockReturnValue(mockService);
      redis.getMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app).get('/api/v1/metrics/test-service');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.service.id).toBe('test-service');
      expect(response.body.metrics.status).toBe('up');
      expect(redis.getMetrics).toHaveBeenCalledWith('metrics:test-service:latest');
      expect(collector.collectServiceMetrics).not.toHaveBeenCalled();
    });

    test('doit retourner 404 si le service est inconnu', async () => {
      services.getServiceById.mockReturnValue(null);

      const response = await request(app).get('/api/v1/metrics/unknown-service');

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('RESOURCE_NOT_FOUND');
    });
  });
}); 