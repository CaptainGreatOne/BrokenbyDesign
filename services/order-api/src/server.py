"""gRPC server implementation for Order API service."""

import os
import sys
import signal
import uuid
import time
from concurrent import futures

import grpc

# Import generated protobuf code
import order_pb2
import order_pb2_grpc

# Import local modules
import db
import redis_queue
from logger import json_log
from metrics import start_metrics_server, grpc_requests_total, grpc_request_duration_seconds, orders_created_total


class OrderServicer(order_pb2_grpc.OrderServiceServicer):
    """Implementation of the OrderService gRPC service."""

    def _get_correlation_id(self, context: grpc.ServicerContext) -> str:
        """
        Extract correlation ID from gRPC metadata or generate new one.

        Args:
            context: gRPC context containing metadata

        Returns:
            Correlation ID string
        """
        metadata = dict(context.invocation_metadata())
        correlation_id = metadata.get("x-correlation-id")

        if not correlation_id:
            correlation_id = str(uuid.uuid4())
            json_log("DEBUG", "Generated new correlation ID",
                    correlation_id=correlation_id)

        return correlation_id

    def CreateOrder(self, request, context):
        """
        Create a new order.

        Args:
            request: CreateOrderRequest with product_id and quantity
            context: gRPC context

        Returns:
            CreateOrderResponse with order_id and status
        """
        start_time = time.time()
        correlation_id = self._get_correlation_id(context)

        json_log("INFO", "CreateOrder RPC called",
                product_id=request.product_id,
                quantity=request.quantity,
                correlation_id=correlation_id)

        try:
            # Check cache for product first
            product = redis_queue.get_cached_product(request.product_id)

            # If not cached, get from database and cache it
            if product is None:
                product = db.get_product(request.product_id)

                if product is None:
                    json_log("ERROR", "Product not found",
                            product_id=request.product_id,
                            correlation_id=correlation_id)
                    context.set_code(grpc.StatusCode.NOT_FOUND)
                    context.set_details(f"Product {request.product_id} not found")

                    # Track metrics for NOT_FOUND
                    duration = time.time() - start_time
                    grpc_request_duration_seconds.labels(method='CreateOrder').observe(duration)
                    grpc_requests_total.labels(method='CreateOrder', status='NOT_FOUND').inc()

                    return order_pb2.CreateOrderResponse()

                # Cache the product for future requests
                redis_queue.cache_product(request.product_id, product, ttl=300)

            # Create order in database
            order = db.create_order(request.product_id, request.quantity)

            # Enqueue fulfillment message to Redis
            redis_queue.enqueue_fulfillment(
                order_id=order["id"],
                product_id=request.product_id,
                quantity=request.quantity,
                correlation_id=correlation_id
            )

            json_log("INFO", "Order created successfully",
                    order_id=order["id"],
                    status=order["status"],
                    correlation_id=correlation_id)

            # Track metrics for successful order creation
            duration = time.time() - start_time
            grpc_request_duration_seconds.labels(method='CreateOrder').observe(duration)
            grpc_requests_total.labels(method='CreateOrder', status='OK').inc()
            orders_created_total.inc()

            return order_pb2.CreateOrderResponse(
                order_id=order["id"],
                status=order["status"]
            )

        except Exception as e:
            json_log("ERROR", "Failed to create order",
                    error=str(e),
                    correlation_id=correlation_id)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Internal error: {str(e)}")

            # Track metrics for INTERNAL error
            duration = time.time() - start_time
            grpc_request_duration_seconds.labels(method='CreateOrder').observe(duration)
            grpc_requests_total.labels(method='CreateOrder', status='INTERNAL').inc()

            return order_pb2.CreateOrderResponse()

    def GetOrder(self, request, context):
        """
        Get an order by ID.

        Args:
            request: GetOrderRequest with order_id
            context: gRPC context

        Returns:
            Order message with order details
        """
        start_time = time.time()
        correlation_id = self._get_correlation_id(context)

        json_log("INFO", "GetOrder RPC called",
                order_id=request.order_id,
                correlation_id=correlation_id)

        try:
            order = db.get_order(request.order_id)

            if order is None:
                json_log("ERROR", "Order not found",
                        order_id=request.order_id,
                        correlation_id=correlation_id)
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details(f"Order {request.order_id} not found")

                # Track metrics for NOT_FOUND
                duration = time.time() - start_time
                grpc_request_duration_seconds.labels(method='GetOrder').observe(duration)
                grpc_requests_total.labels(method='GetOrder', status='NOT_FOUND').inc()

                return order_pb2.Order()

            json_log("INFO", "Order retrieved successfully",
                    order_id=order["id"],
                    correlation_id=correlation_id)

            # Track metrics for successful retrieval
            duration = time.time() - start_time
            grpc_request_duration_seconds.labels(method='GetOrder').observe(duration)
            grpc_requests_total.labels(method='GetOrder', status='OK').inc()

            return order_pb2.Order(
                id=order["id"],
                product_id=order["product_id"],
                quantity=order["quantity"],
                status=order["status"],
                created_at=str(order["created_at"])
            )

        except Exception as e:
            json_log("ERROR", "Failed to get order",
                    error=str(e),
                    correlation_id=correlation_id)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Internal error: {str(e)}")

            # Track metrics for INTERNAL error
            duration = time.time() - start_time
            grpc_request_duration_seconds.labels(method='GetOrder').observe(duration)
            grpc_requests_total.labels(method='GetOrder', status='INTERNAL').inc()

            return order_pb2.Order()

    def ListOrders(self, request, context):
        """
        List recent orders.

        Args:
            request: ListOrdersRequest with optional limit
            context: gRPC context

        Returns:
            ListOrdersResponse with list of orders
        """
        start_time = time.time()
        correlation_id = self._get_correlation_id(context)

        limit = request.limit if request.limit > 0 else 10

        json_log("INFO", "ListOrders RPC called",
                limit=limit,
                correlation_id=correlation_id)

        try:
            orders = db.list_orders(limit=limit)

            order_messages = [
                order_pb2.Order(
                    id=order["id"],
                    product_id=order["product_id"],
                    quantity=order["quantity"],
                    status=order["status"],
                    created_at=str(order["created_at"])
                )
                for order in orders
            ]

            json_log("INFO", "Orders listed successfully",
                    count=len(order_messages),
                    correlation_id=correlation_id)

            # Track metrics for successful listing
            duration = time.time() - start_time
            grpc_request_duration_seconds.labels(method='ListOrders').observe(duration)
            grpc_requests_total.labels(method='ListOrders', status='OK').inc()

            return order_pb2.ListOrdersResponse(orders=order_messages)

        except Exception as e:
            json_log("ERROR", "Failed to list orders",
                    error=str(e),
                    correlation_id=correlation_id)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Internal error: {str(e)}")

            # Track metrics for INTERNAL error
            duration = time.time() - start_time
            grpc_request_duration_seconds.labels(method='ListOrders').observe(duration)
            grpc_requests_total.labels(method='ListOrders', status='INTERNAL').inc()

            return order_pb2.ListOrdersResponse()


def serve():
    """Start the gRPC server."""
    # Initialize database pool
    try:
        db.init_pool()
        json_log("INFO", "Database initialized")
    except Exception as e:
        json_log("CRITICAL", "Failed to initialize database", error=str(e))
        sys.exit(1)

    # Start Prometheus metrics HTTP server
    metrics_port = int(os.getenv("METRICS_PORT", "8000"))
    try:
        start_metrics_server(port=metrics_port)
        json_log("INFO", f"Metrics HTTP server started on port {metrics_port}")
    except Exception as e:
        json_log("ERROR", "Failed to start metrics server", error=str(e))
        # Non-fatal error, continue with gRPC server

    # Get gRPC port from environment
    grpc_port = os.getenv("GRPC_PORT", "50051")

    # Create gRPC server
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    order_pb2_grpc.add_OrderServiceServicer_to_server(OrderServicer(), server)

    # Listen on all interfaces
    server_address = f"[::]:{grpc_port}"
    server.add_insecure_port(server_address)

    # Handle graceful shutdown
    def handle_sigterm(signum, frame):
        json_log("INFO", "Received SIGTERM, shutting down gracefully")
        server.stop(grace=5)

    signal.signal(signal.SIGTERM, handle_sigterm)
    signal.signal(signal.SIGINT, handle_sigterm)

    # Start server
    server.start()
    json_log("INFO", f"Order API started on port {grpc_port}")

    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        json_log("INFO", "Received keyboard interrupt, shutting down")
        server.stop(grace=5)


if __name__ == "__main__":
    serve()
