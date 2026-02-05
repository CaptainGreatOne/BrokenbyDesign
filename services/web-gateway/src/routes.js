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
      logger.warn('Invalid product_id', { correlation_id: correlationId, product_id });
      return res.status(400).json({
        error: 'product_id is required and must be an integer'
      });
    }

    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      logger.warn('Invalid quantity', { correlation_id: correlationId, quantity });
      return res.status(400).json({
        error: 'quantity is required and must be a positive integer'
      });
    }

    // Call gRPC CreateOrder
    const response = await grpcClient.createOrder(correlationId, product_id, quantity);

    logger.info('Order created', {
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
      logger.warn('Invalid order_id', { correlation_id: correlationId, id: req.params.id });
      return res.status(400).json({
        error: 'order_id must be a valid integer'
      });
    }

    // Call gRPC GetOrder
    const order = await grpcClient.getOrder(correlationId, orderId);

    logger.info('Order retrieved', {
      correlation_id: correlationId,
      order_id: orderId
    });

    res.status(200).json(order);
  } catch (error) {
    const httpStatus = error.httpStatus || 500;
    logger.error('Get order failed', {
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
