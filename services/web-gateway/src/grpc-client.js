/**
 * gRPC client for connecting to Order API service
 * Translates REST requests to gRPC calls with correlation ID propagation
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const logger = require('./logger');

// Load proto definition
const PROTO_PATH = path.join(__dirname, '../../proto/order.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

// Connect to Order API
const GRPC_ADDR = process.env.GRPC_ORDER_API_ADDR || 'order-api:50051';
const client = new orderProto.OrderService(
  GRPC_ADDR,
  grpc.credentials.createInsecure()
);

logger.info('gRPC client initialized', { grpc_addr: GRPC_ADDR });

/**
 * Map gRPC status codes to HTTP status codes
 */
function mapGrpcStatusToHttp(grpcStatus) {
  const statusMap = {
    [grpc.status.OK]: 200,
    [grpc.status.CANCELLED]: 499,
    [grpc.status.UNKNOWN]: 500,
    [grpc.status.INVALID_ARGUMENT]: 400,
    [grpc.status.DEADLINE_EXCEEDED]: 504,
    [grpc.status.NOT_FOUND]: 404,
    [grpc.status.ALREADY_EXISTS]: 409,
    [grpc.status.PERMISSION_DENIED]: 403,
    [grpc.status.RESOURCE_EXHAUSTED]: 429,
    [grpc.status.FAILED_PRECONDITION]: 400,
    [grpc.status.ABORTED]: 409,
    [grpc.status.OUT_OF_RANGE]: 400,
    [grpc.status.UNIMPLEMENTED]: 501,
    [grpc.status.INTERNAL]: 500,
    [grpc.status.UNAVAILABLE]: 503,
    [grpc.status.DATA_LOSS]: 500,
    [grpc.status.UNAUTHENTICATED]: 401
  };

  return statusMap[grpcStatus] || 500;
}

/**
 * Create gRPC metadata with correlation ID
 */
function createMetadata(correlationId) {
  const metadata = new grpc.Metadata();
  metadata.add('x-correlation-id', correlationId);
  return metadata;
}

/**
 * Promisified createOrder call
 */
function createOrder(correlationId, productId, quantity) {
  return new Promise((resolve, reject) => {
    const metadata = createMetadata(correlationId);
    const request = {
      product_id: productId,
      quantity: quantity
    };

    client.createOrder(request, metadata, (error, response) => {
      if (error) {
        const httpStatus = mapGrpcStatusToHttp(error.code);
        logger.error('gRPC createOrder failed', {
          correlation_id: correlationId,
          grpc_code: error.code,
          http_status: httpStatus,
          error: error.message
        });

        const err = new Error(error.message);
        err.httpStatus = httpStatus;
        err.grpcCode = error.code;
        return reject(err);
      }

      logger.info('gRPC createOrder success', {
        correlation_id: correlationId,
        order_id: response.order_id
      });
      resolve(response);
    });
  });
}

/**
 * Promisified getOrder call
 */
function getOrder(correlationId, orderId) {
  return new Promise((resolve, reject) => {
    const metadata = createMetadata(correlationId);
    const request = {
      order_id: orderId
    };

    client.getOrder(request, metadata, (error, response) => {
      if (error) {
        const httpStatus = mapGrpcStatusToHttp(error.code);
        logger.error('gRPC getOrder failed', {
          correlation_id: correlationId,
          order_id: orderId,
          grpc_code: error.code,
          http_status: httpStatus,
          error: error.message
        });

        const err = new Error(error.message);
        err.httpStatus = httpStatus;
        err.grpcCode = error.code;
        return reject(err);
      }

      logger.info('gRPC getOrder success', {
        correlation_id: correlationId,
        order_id: orderId
      });
      resolve(response);
    });
  });
}

/**
 * Promisified listOrders call
 */
function listOrders(correlationId, limit = 10) {
  return new Promise((resolve, reject) => {
    const metadata = createMetadata(correlationId);
    const request = {
      limit: limit
    };

    client.listOrders(request, metadata, (error, response) => {
      if (error) {
        const httpStatus = mapGrpcStatusToHttp(error.code);
        logger.error('gRPC listOrders failed', {
          correlation_id: correlationId,
          limit: limit,
          grpc_code: error.code,
          http_status: httpStatus,
          error: error.message
        });

        const err = new Error(error.message);
        err.httpStatus = httpStatus;
        err.grpcCode = error.code;
        return reject(err);
      }

      logger.info('gRPC listOrders success', {
        correlation_id: correlationId,
        order_count: response.orders ? response.orders.length : 0
      });
      resolve(response);
    });
  });
}

module.exports = {
  createOrder,
  getOrder,
  listOrders
};
