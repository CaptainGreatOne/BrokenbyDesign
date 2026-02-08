package main

import (
	"context"
	"fmt"
	"fulfillment-worker/internal/db"
	"fulfillment-worker/internal/logger"
	"fulfillment-worker/internal/metrics"
	"fulfillment-worker/internal/queue"
	"math/rand"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

	// Handle signals in a separate goroutine
	go func() {
		sig := <-sigChan
		logger.Info(fmt.Sprintf("Received signal: %v", sig), "Main", "", nil)
		logger.Info("Initiating graceful shutdown", "Main", "", nil)
		cancel()
	}()

	// Initialize database pool
	logger.Info("Initializing database connection", "Main", "", nil)
	pool, err := db.NewPool(ctx)
	if err != nil {
		logger.Error("Failed to initialize database pool", "Main", "", err, nil)
		os.Exit(1)
	}
	defer pool.Close()

	// Initialize Redis client
	logger.Info("Initializing Redis connection", "Main", "", nil)
	rdb, err := queue.NewRedisClient(ctx)
	if err != nil {
		logger.Error("Failed to initialize Redis client", "Main", "", err, nil)
		os.Exit(1)
	}
	defer rdb.Close()

	// Start metrics server in a goroutine
	go metrics.StartMetricsServer(2112)

	logger.Info("Fulfillment Worker started, consuming from fulfillment_queue", "Main", "", nil)

	// Define order processing handler
	processOrder := func(ctx context.Context, msg queue.OrderMessage) error {
		startTime := time.Now()
		orderID := fmt.Sprintf("%d", msg.OrderID)

		logger.Info(fmt.Sprintf("Processing order %d", msg.OrderID), "ProcessOrder", orderID, map[string]interface{}{
			"order_id":   msg.OrderID,
			"product_id": msg.ProductID,
			"quantity":   msg.Quantity,
		})

		// Simulate realistic processing delays (~8% of the time)
		if rand.Float64() < 0.08 {
			delayMs := 500 + rand.Intn(1500)
			logger.Warn("Processing taking longer than expected", "ProcessOrder", orderID, map[string]interface{}{
				"duration_ms": delayMs,
			})
		}

		// Update order status to "processing"
		err := db.UpdateOrderStatus(ctx, pool, msg.OrderID, "processing")
		if err != nil {
			logger.Error("Failed to update order status to processing", "ProcessOrder", orderID, err, map[string]interface{}{
				"order_id": msg.OrderID,
			})
			metrics.ProcessingDuration.WithLabelValues("error").Observe(time.Since(startTime).Seconds())
			metrics.OrdersProcessed.WithLabelValues("error").Inc()
			return err
		}

		// Simulate processing time with realistic variation (500ms to 2s)
		// This creates latency variation visible in future observability tooling
		processingDelay := time.Duration(500+rand.Intn(1500)) * time.Millisecond
		time.Sleep(processingDelay)

		// Simulate temporary database latency (~3% of the time)
		if rand.Float64() < 0.03 {
			logger.Warn("Temporary database latency detected", "ProcessOrder", orderID, nil)
		}

		// Update order status to "fulfilled"
		err = db.UpdateOrderStatus(ctx, pool, msg.OrderID, "fulfilled")
		if err != nil {
			logger.Error("Failed to update order status to fulfilled", "ProcessOrder", orderID, err, map[string]interface{}{
				"order_id": msg.OrderID,
			})
			metrics.ProcessingDuration.WithLabelValues("error").Observe(time.Since(startTime).Seconds())
			metrics.OrdersProcessed.WithLabelValues("error").Inc()
			return err
		}

		duration := time.Since(startTime)
		logger.Info(fmt.Sprintf("Order %d fulfilled", msg.OrderID), "ProcessOrder", orderID, map[string]interface{}{
			"order_id":              msg.OrderID,
			"product_id":            msg.ProductID,
			"quantity":              msg.Quantity,
			"processing_duration_ms": duration.Milliseconds(),
		})

		// Track successful processing metrics
		metrics.ProcessingDuration.WithLabelValues("success").Observe(duration.Seconds())
		metrics.OrdersProcessed.WithLabelValues("success").Inc()

		return nil
	}

	// Start consuming from the queue
	queue.Consume(ctx, rdb, processOrder)

	// This line is reached when context is cancelled
	logger.Info("Fulfillment Worker shutting down", "Main", "", nil)
}
