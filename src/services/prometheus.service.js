// metrics-service-Tadayoshi123/src/services/prometheus.service.js
const axios = require('axios');
const { logger } = require('../config/logger');
const { AppError, ErrorCodes } = require('../middlewares/errorHandler');

const PROMETHEUS_URL = process.env.PROMETHEUS_URL;

if (!PROMETHEUS_URL) {
  logger.warn('PROMETHEUS_URL is not set. Prometheus query functionality will be disabled.');
}

/**
 * Executes a PromQL query.
 * @param {string} query The PromQL query string.
 * @returns {Promise<Object>} The result from Prometheus.
 */
const executeQuery = async (query) => {
  if (!PROMETHEUS_URL) {
    throw new AppError('Prometheus service is not configured.', 503, ErrorCodes.SERVICE_UNAVAILABLE);
  }

  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
      params: { query },
      timeout: 15000 // 15 seconds timeout
    });

    if (response.data.status !== 'success') {
      throw new AppError(`Prometheus query failed: ${response.data.error}`, 500, ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    return response.data.data;
  } catch (error) {
    logger.error(`Error querying Prometheus: ${error.message}`);
    if (error.isAxiosError) {
        throw new AppError(`Failed to connect to Prometheus: ${error.message}`, 503, ErrorCodes.SERVICE_UNAVAILABLE);
    }
    throw error;
  }
};

/**
 * Executes a PromQL range query.
 * @param {string} query The PromQL query string.
 * @param {string} start The start timestamp (RFC3339 or Unix timestamp).
 * @param {string} end The end timestamp (RFC3339 or Unix timestamp).
 * @param {string} step The query resolution step width in duration format (e.g., '15s', '1m').
 * @returns {Promise<Object>} The result from Prometheus.
 */
const executeRangeQuery = async (query, start, end, step) => {
    if (!PROMETHEUS_URL) {
        throw new AppError('Prometheus service is not configured.', 503, ErrorCodes.SERVICE_UNAVAILABLE);
    }

    try {
        const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
            params: { query, start, end, step },
            timeout: 30000 // 30 seconds timeout for potentially larger queries
        });

        if (response.data.status !== 'success') {
            throw new AppError(`Prometheus range query failed: ${response.data.error || 'Unknown error'}`, 500, ErrorCodes.INTERNAL_SERVER_ERROR);
        }

        return response.data.data;
    } catch (error) {
        logger.error(`Error executing range query on Prometheus: ${error.message}`);
        if (error.isAxiosError) {
            throw new AppError(`Failed to connect to Prometheus for range query: ${error.message}`, 503, ErrorCodes.SERVICE_UNAVAILABLE);
        }
        throw error;
    }
};


module.exports = {
  executeQuery,
  executeRangeQuery
}; 