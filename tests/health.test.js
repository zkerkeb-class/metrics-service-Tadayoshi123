const request = require('supertest');
const { app } = require('../src/server');
const redis = require('../src/config/redis');

// Mock de Redis pour éviter de dépendre d'une instance réelle
jest.mock('../src/config/redis', () => ({
  isRedisAvailable: jest.fn(),
  getRedisClient: jest.fn(),
  initRedis: jest.fn(),
  closeRedis: jest.fn(),
}));

// Mock d'autres services initialisés dans bootstrap
jest.mock('../src/services/CollectorService', () => ({
  setupCollectors: jest.fn(),
  stopCollectors: jest.fn(),
}));
jest.mock('../src/services/StorageService', () => ({
  initStorage: jest.fn(),
  cleanupOldMetrics: jest.fn(),
}));
jest.mock('../src/services/AlertService', () => ({
  setupAlerts: jest.fn(),
}));

describe('Health Endpoints', () => {
  // Réinitialiser les mocks avant chaque test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    test('doit retourner un statut 200 OK avec Redis "up"', async () => {
      redis.isRedisAvailable.mockResolvedValue(true);
      
      const response = await request(app).get('/health');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('metrics-service');
      expect(response.body.dependencies.redis.status).toBe('up');
    });

    test('doit retourner un statut 200 OK avec Redis "down"', async () => {
      redis.isRedisAvailable.mockResolvedValue(false);
      
      const response = await request(app).get('/health');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.dependencies.redis.status).toBe('down');
    });
  });

  describe('GET /liveness', () => {
    test('doit retourner un statut 200 OK et un message simple', async () => {
      const response = await request(app).get('/liveness');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /readiness', () => {
    test('doit retourner un statut 200 OK et ready:true', async () => {
      const response = await request(app).get('/readiness');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.ready).toBe(true);
    });
  });
}); 