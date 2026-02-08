/**
 * Express router with REST endpoints for Order API
 * Translates HTTP requests to gRPC calls with validation
 */

const express = require('express');
const grpcClient = require('./grpc-client');
const logger = require('./logger');

const router = express.Router();

/**
 * POST /orders - Create a new order
 */
router.post('/orders', async (req, res) => {
  const correlationId = req.correlationId;

  try {
    // Validate request body
    const { product_id, quantity } = req.body;

    if (!product_id || typeof product_id !== 'number') {
      logger.warn('Invalid product_id', {
        handler: '/api/orders',
        correlation_id: correlationId,
        product_id
      });
      return res.status(400).json({
        error: 'product_id is required and must be an integer'
      });
    }

    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      logger.warn('Invalid quantity', {
        handler: '/api/orders',
        correlation_id: correlationId,
        quantity
      });
      return res.status(400).json({
        error: 'quantity is required and must be a positive integer'
      });
    }

    // Realistic error simulation: Large quantity warning (~3% chance)
    if (quantity > 50 && Math.random() < 0.03) {
      logger.warn('Large quantity detected, may cause fulfillment delay', {
        handler: '/api/orders',
        correlation_id: correlationId,
        product_id,
        quantity
      });
    }

    // Realistic error simulation: Simulated upstream timeout (~5% chance)
    if (Math.random() < 0.05) {
      logger.warn('Upstream response slow, continuing', {
        handler: '/api/orders',
        correlation_id: correlationId,
        timeout_threshold_ms: 100
      });
      // Add small delay to simulate slow upstream
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Call gRPC CreateOrder
    const response = await grpcClient.createOrder(correlationId, product_id, quantity);

    logger.info('Order created', {
      handler: '/api/orders',
      correlation_id: correlationId,
      order_id: response.order_id,
      product_id,
      quantity
    });

    res.status(201).json({
      order_id: response.order_id,
      status: response.status
    });
  } catch (error) {
    const httpStatus = error.httpStatus || 500;
    logger.error('Create order failed', {
      handler: '/api/orders',
      correlation_id: correlationId,
      error: error.message,
      http_status: httpStatus
    });

    res.status(httpStatus).json({
      error: error.message
    });
  }
});

/**
 * GET /orders/:id - Get order by ID
 */
router.get('/orders/:id', async (req, res) => {
  const correlationId = req.correlationId;

  try {
    const orderId = parseInt(req.params.id, 10);

    if (isNaN(orderId)) {
      logger.warn('Invalid order_id', {
        handler: '/api/orders/:id',
        correlation_id: correlationId,
        id: req.params.id
      });
      return res.status(400).json({
        error: 'order_id must be a valid integer'
      });
    }

    // Call gRPC GetOrder
    const order = await grpcClient.getOrder(correlationId, orderId);

    logger.info('Order retrieved', {
      handler: '/api/orders/:id',
      correlation_id: correlationId,
      order_id: orderId
    });

    res.status(200).json(order);
  } catch (error) {
    const httpStatus = error.httpStatus || 500;
    logger.error('Get order failed', {
      handler: '/api/orders/:id',
      correlation_id: correlationId,
      order_id: req.params.id,
      error: error.message,
      http_status: httpStatus
    });

    res.status(httpStatus).json({
      error: error.message
    });
  }
});

/**
 * GET /orders - List recent orders
 */
router.get('/orders', async (req, res) => {
  const correlationId = req.correlationId;

  try {
    // Parse limit query parameter
    let limit = parseInt(req.query.limit, 10) || 10;

    // Enforce max limit
    if (limit > 100) {
      limit = 100;
    }

    if (limit < 1) {
      limit = 10;
    }

    // Call gRPC ListOrders
    const response = await grpcClient.listOrders(correlationId, limit);

    logger.info('Orders listed', {
      handler: '/api/orders',
      correlation_id: correlationId,
      count: response.orders ? response.orders.length : 0,
      limit
    });

    res.status(200).json({
      orders: response.orders || []
    });
  } catch (error) {
    const httpStatus = error.httpStatus || 500;
    logger.error('List orders failed', {
      handler: '/api/orders',
      correlation_id: correlationId,
      error: error.message,
      http_status: httpStatus
    });

    res.status(httpStatus).json({
      error: error.message
    });
  }
});

/**
 * GET /health - Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'web-gateway',
    uptime: process.uptime()
  });
});

/**
 * GET / - Root endpoint with service information
 */
router.get('/', (req, res) => {
  res.status(200).json({
    service: 'web-gateway',
    endpoints: [
      'POST /orders',
      'GET /orders/:id',
      'GET /orders',
      'GET /health'
    ]
  });
});

module.exports = router;
