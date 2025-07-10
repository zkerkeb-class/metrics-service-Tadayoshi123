const axios = require('axios');
const { collectServiceMetrics } = require('../src/services/CollectorService');
const { logger } = require('../src/config/logger');
const { serviceStatus, serviceResponseTime, scrapingErrorsTotal } = require('../src/middlewares/metrics');
const redis = require('../src/config/redis');

// Désactiver les logs pour les tests
jest.mock('../src/config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock des métriques Prometheus
jest.mock('../src/middlewares/metrics', () => ({
  serviceStatus: {
    set: jest.fn(),
  },
  serviceResponseTime: {
    set: jest.fn(),
  },
  scrapingErrorsTotal: {
    inc: jest.fn(),
  },
}));

// Mock de Redis
jest.mock('../src/config/redis', () => ({
  storeMetrics: jest.fn(),
}));

// Mock d'axios
jest.mock('axios');

describe('CollectorService', () => {
  // Réinitialiser les mocks avant chaque test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockService = {
    id: 'test-service',
    name: 'Service de Test',
    url: 'http://test-service-url:3000',
    healthPath: '/health',
  };

  test('doit collecter les métriques avec succès pour un service "up"', async () => {
    // Configuration du mock axios pour une réponse réussie
    axios.get.mockResolvedValue({
      status: 200,
      data: { status: 'ok' },
    });

    const metrics = await collectServiceMetrics(mockService);

    // Vérifications
    expect(metrics.status).toBe('up');
    expect(metrics.service).toBe('test-service');
    expect(metrics.responseTime).toBeGreaterThanOrEqual(0);
    expect(axios.get).toHaveBeenCalledWith('http://test-service-url:3000/health', expect.any(Object));
    
    // Vérifier les métriques Prometheus
    expect(serviceStatus.set).toHaveBeenCalledWith({ service: 'test-service' }, 1);
    expect(serviceResponseTime.set).toHaveBeenCalledWith({ service: 'test-service' }, expect.any(Number));
    expect(scrapingErrorsTotal.inc).not.toHaveBeenCalled();
    
    // Vérifier le stockage Redis
    expect(redis.storeMetrics).toHaveBeenCalledWith('test-service:health', expect.objectContaining({ status: 'up' }));
  });

  test('doit gérer un service "down" (réponse non-200)', async () => {
    // Configuration du mock axios pour une réponse d'erreur
    axios.get.mockRejectedValue({
      response: { status: 503 },
      message: 'Service Unavailable',
    });

    const metrics = await collectServiceMetrics(mockService);
    
    // Vérifications
    expect(metrics.status).toBe('down');
    expect(metrics.error).toBe('Service Unavailable');
    expect(axios.get).toHaveBeenCalledWith('http://test-service-url:3000/health', expect.any(Object));

    // Vérifier les métriques Prometheus
    expect(serviceStatus.set).toHaveBeenCalledWith({ service: 'test-service' }, 0);
    expect(scrapingErrorsTotal.inc).toHaveBeenCalledWith({ service: 'test-service' });
    
    // Vérifier le stockage Redis
    expect(redis.storeMetrics).toHaveBeenCalledWith('test-service:health', expect.objectContaining({ status: 'down' }));
  });

  test('doit gérer une erreur réseau (timeout)', async () => {
    // Configuration du mock axios pour une erreur réseau
    axios.get.mockRejectedValue(new Error('Network Error'));

    const metrics = await collectServiceMetrics(mockService);

    // Vérifications
    expect(metrics.status).toBe('down');
    expect(metrics.error).toBe('Network Error');
    expect(axios.get).toHaveBeenCalledWith('http://test-service-url:3000/health', expect.any(Object));
    
    // Vérifier les métriques Prometheus
    expect(serviceStatus.set).toHaveBeenCalledWith({ service: 'test-service' }, 0);
    expect(scrapingErrorsTotal.inc).toHaveBeenCalledWith({ service: 'test-service' });
    
    // Vérifier le stockage Redis
    expect(redis.storeMetrics).toHaveBeenCalledWith('test-service:health', expect.objectContaining({ status: 'down' }));
  });
}); 