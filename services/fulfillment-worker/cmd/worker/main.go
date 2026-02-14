package main

import (
	"context"
	"fmt"
	"fulfillment-worker/internal/chaos"
	"fulfillment-worker/internal/db"
	"fulfillment-worker/internal/logger"
	"fulfillment-worker/internal/metrics"
	"fulfillment-worker/internal/queue"
	"fulfillment-worker/internal/tracing"
	"math/rand"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

func main() {
	// Initialize OpenTelemetry tracing FIRST
	shutdownTracer, err := tracing.InitTracer("fulfillment-worker")
	if err != nil {
		logger.Error("Failed to initialize tracing", "Main", "", err, nil)
		// Non-fatal: continue without tracing
	} else {
		defer func() {
			if err := shutdownTracer(context.Background()); err != nil {
				logger.Error("Failed to shut down tracer", "Main", "", err, nil)
			}
		}()
	}

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

	// Initialize service health gauge to 1 (healthy)
	metrics.ServiceHealthy.Set(1)

	logger.Info("Fulfillment Worker started, consuming from fulfillment_queue", "Main", "", nil)

	// Define order processing handler
	processOrder := func(ctx context.Context, msg queue.OrderMessage) error {
		startTime := time.Now()
		orderID := fmt.Sprintf("%d", msg.OrderID)
		tr := otel.Tracer("fulfillment-worker")

		logger.InfoCtx(ctx, fmt.Sprintf("Processing order %d", msg.OrderID), "ProcessOrder", orderID, map[string]interface{}{
			"order_id":   msg.OrderID,
			"product_id": msg.ProductID,
			"quantity":   msg.Quantity,
		})

		// Chaos engineering checks
		if shouldCrash := chaos.ShouldCrash(); shouldCrash {
			logger.Error("Chaos: service crash triggered", "ChaosInterceptor", orderID, nil, nil)
			time.Sleep(100 * time.Millisecond) // Allow log flush
			os.Exit(1)
		}

		if inject, delay := chaos.ShouldInjectLatency(); inject {
			logger.Warn(fmt.Sprintf("Chaos: injecting latency %v", delay), "ChaosInterceptor", orderID, nil)
			time.Sleep(delay)
		}

		if chaos.ShouldInjectError() {
			logger.Warn("Chaos: injecting processing error", "ChaosInterceptor", orderID, nil)
			// Track as error in metrics
			duration := time.Since(startTime)
			exemplar := metrics.TraceExemplar(ctx)
			if exemplar != nil {
				metrics.ProcessingDuration.WithLabelValues("error").(prometheus.ExemplarObserver).ObserveWithExemplar(duration.Seconds(), exemplar)
				metrics.OrdersProcessed.WithLabelValues("error").(prometheus.ExemplarAdder).AddWithExemplar(1, exemplar)
			} else {
				metrics.ProcessingDuration.WithLabelValues("error").Observe(duration.Seconds())
				metrics.OrdersProcessed.WithLabelValues("error").Inc()
			}
			return fmt.Errorf("chaos: injected processing error")
		}

		// Simulate realistic processing delays (~8% of the time)
		if rand.Float64() < 0.08 {
			delayMs := 500 + rand.Intn(1500)
			logger.WarnCtx(ctx, "Processing taking longer than expected", "ProcessOrder", orderID, map[string]interface{}{
				"duration_ms": delayMs,
			})
		}

		// Update order status to "processing" with semantic span
		func() {
			_, updateSpan := tr.Start(ctx, "update-order-status-processing", trace.WithAttributes(
				attribute.Int("order.id", msg.OrderID),
				attribute.String("order.status", "processing"),
			))
			defer updateSpan.End()
			err := db.UpdateOrderStatus(ctx, pool, msg.OrderID, "processing")
			if err != nil {
				updateSpan.RecordError(err)
				updateSpan.SetStatus(codes.Error, err.Error())
			}
		}()

		err := db.UpdateOrderStatus(ctx, pool, msg.OrderID, "processing")
		if err != nil {
			logger.ErrorCtx(ctx, "Failed to update order status to processing", "ProcessOrder", orderID, err, map[string]interface{}{
				"order_id": msg.OrderID,
			})
			duration := time.Since(startTime)
			exemplar := metrics.TraceExemplar(ctx)
			if exemplar != nil {
				metrics.ProcessingDuration.WithLabelValues("error").(prometheus.ExemplarObserver).ObserveWithExemplar(duration.Seconds(), exemplar)
				metrics.OrdersProcessed.WithLabelValues("error").(prometheus.ExemplarAdder).AddWithExemplar(1, exemplar)
			} else {
				metrics.ProcessingDuration.WithLabelValues("error").Observe(duration.Seconds())
				metrics.OrdersProcessed.WithLabelValues("error").Inc()
			}
			return err
		}

		// Simulate processing time with realistic variation (500ms to 2s)
		// This creates latency variation visible in future observability tooling
		processingDelay := time.Duration(500+rand.Intn(1500)) * time.Millisecond
		time.Sleep(processingDelay)

		// Simulate temporary database latency (~3% of the time)
		if rand.Float64() < 0.03 {
			logger.WarnCtx(ctx, "Temporary database latency detected", "ProcessOrder", orderID, nil)
		}

		// Update order status to "fulfilled" with semantic span
		func() {
			_, updateSpan := tr.Start(ctx, "update-order-status-fulfilled", trace.WithAttributes(
				attribute.Int("order.id", msg.OrderID),
				attribute.String("order.status", "fulfilled"),
			))
			defer updateSpan.End()
			err := db.UpdateOrderStatus(ctx, pool, msg.OrderID, "fulfilled")
			if err != nil {
				updateSpan.RecordError(err)
				updateSpan.SetStatus(codes.Error, err.Error())
			}
		}()

		err = db.UpdateOrderStatus(ctx, pool, msg.OrderID, "fulfilled")
		if err != nil {
			logger.ErrorCtx(ctx, "Failed to update order status to fulfilled", "ProcessOrder", orderID, err, map[string]interface{}{
				"order_id": msg.OrderID,
			})
			duration := time.Since(startTime)
			exemplar := metrics.TraceExemplar(ctx)
			if exemplar != nil {
				metrics.ProcessingDuration.WithLabelValues("error").(prometheus.ExemplarObserver).ObserveWithExemplar(duration.Seconds(), exemplar)
				metrics.OrdersProcessed.WithLabelValues("error").(prometheus.ExemplarAdder).AddWithExemplar(1, exemplar)
			} else {
				metrics.ProcessingDuration.WithLabelValues("error").Observe(duration.Seconds())
				metrics.OrdersProcessed.WithLabelValues("error").Inc()
			}
			return err
		}

		duration := time.Since(startTime)
		logger.InfoCtx(ctx, fmt.Sprintf("Order %d fulfilled", msg.OrderID), "ProcessOrder", orderID, map[string]interface{}{
			"order_id":              msg.OrderID,
			"product_id":            msg.ProductID,
			"quantity":              msg.Quantity,
			"processing_duration_ms": duration.Milliseconds(),
		})

		// Track successful processing metrics with exemplars
		exemplar := metrics.TraceExemplar(ctx)
		if exemplar != nil {
			metrics.ProcessingDuration.WithLabelValues("success").(prometheus.ExemplarObserver).ObserveWithExemplar(duration.Seconds(), exemplar)
			metrics.OrdersProcessed.WithLabelValues("success").(prometheus.ExemplarAdder).AddWithExemplar(1, exemplar)
		} else {
			metrics.ProcessingDuration.WithLabelValues("success").Observe(duration.Seconds())
			metrics.OrdersProcessed.WithLabelValues("success").Inc()
		}

		return nil
	}

	// Start consuming from the queue
	queue.Consume(ctx, rdb, processOrder)

	// This line is reached when context is cancelled
	logger.Info("Fulfillment Worker shutting down", "Main", "", nil)
}
