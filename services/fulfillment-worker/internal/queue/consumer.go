package queue

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"fulfillment-worker/internal/logger"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// OrderMessage represents a message from the fulfillment queue
type OrderMessage struct {
	OrderID       int    `json:"order_id"`
	ProductID     int    `json:"product_id"`
	Quantity      int    `json:"quantity"`
	CorrelationID string `json:"correlation_id"`
	Timestamp     string `json:"timestamp,omitempty"`
	Traceparent   string `json:"traceparent,omitempty"`
}

const queueName = "fulfillment_queue"

// parseTraceparent parses a W3C traceparent string (e.g., "00-<trace_id>-<span_id>-<flags>")
// and returns the corresponding SpanContext for creating trace links.
func parseTraceparent(traceparent string) (trace.SpanContext, bool) {
	if traceparent == "" {
		return trace.SpanContext{}, false
	}

	parts := strings.Split(traceparent, "-")
	if len(parts) != 4 || parts[0] != "00" {
		return trace.SpanContext{}, false
	}

	traceIDHex := parts[1]
	spanIDHex := parts[2]
	flagsHex := parts[3]

	if len(traceIDHex) != 32 || len(spanIDHex) != 16 || len(flagsHex) != 2 {
		return trace.SpanContext{}, false
	}

	traceIDBytes, err := hex.DecodeString(traceIDHex)
	if err != nil {
		return trace.SpanContext{}, false
	}

	spanIDBytes, err := hex.DecodeString(spanIDHex)
	if err != nil {
		return trace.SpanContext{}, false
	}

	flagsByte, err := hex.DecodeString(flagsHex)
	if err != nil {
		return trace.SpanContext{}, false
	}

	var traceID trace.TraceID
	var spanID trace.SpanID
	copy(traceID[:], traceIDBytes)
	copy(spanID[:], spanIDBytes)

	cfg := trace.SpanContextConfig{
		TraceID:    traceID,
		SpanID:     spanID,
		TraceFlags: trace.TraceFlags(flagsByte[0]),
		Remote:     true,
	}

	return trace.NewSpanContext(cfg), true
}

// NewRedisClient creates a new Redis client with retry logic
func NewRedisClient(ctx context.Context) (*redis.Client, error) {
	redisURL := getEnv("REDIS_URL", "redis://redis:6379")

	maxRetries := 5
	retryDelay := 2 * time.Second

	for attempt := 1; attempt <= maxRetries; attempt++ {
		logger.Info("Connecting to Redis", "RedisConnection", "", map[string]interface{}{
			"attempt":     attempt,
			"max_retries": maxRetries,
			"url":         redisURL,
		})

		opt, err := redis.ParseURL(redisURL)
		if err != nil {
			logger.Error("Failed to parse Redis URL", "RedisConnection", "", err, map[string]interface{}{
				"url": redisURL,
			})
			return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
		}

		client := redis.NewClient(opt)

		// Test the connection
		_, err = client.Ping(ctx).Result()
		if err != nil {
			logger.Error("Failed to ping Redis", "RedisConnection", "", err, map[string]interface{}{
				"attempt": attempt,
			})
			client.Close()
			if attempt < maxRetries {
				logger.Info("Retrying Redis connection", "RedisConnection", "", map[string]interface{}{
					"delay_seconds": retryDelay.Seconds(),
				})
				time.Sleep(retryDelay)
				continue
			}
			return nil, fmt.Errorf("failed to connect to Redis after %d attempts: %w", maxRetries, err)
		}

		logger.Info("Redis connection established successfully", "RedisConnection", "", nil)
		return client, nil
	}

	return nil, fmt.Errorf("failed to connect to Redis after %d attempts", maxRetries)
}

// Consume continuously reads messages from the Redis queue and processes them with the provided handler
func Consume(ctx context.Context, rdb *redis.Client, handler func(context.Context, OrderMessage) error) {
	logger.Info("Starting queue consumer", "QueueConsumer", "", map[string]interface{}{
		"queue": queueName,
	})

	for {
		// Check if context has been cancelled (for graceful shutdown)
		select {
		case <-ctx.Done():
			logger.Info("Context cancelled, stopping consumer", "QueueConsumer", "", nil)
			return
		default:
			// Continue processing
		}

		// BRPOP with 5-second timeout (allows periodic context check)
		result, err := rdb.BRPop(ctx, 5*time.Second, queueName).Result()
		if err != nil {
			// Timeout is expected and not an error
			if err == redis.Nil {
				continue
			}

			// Context cancellation is expected during shutdown
			if ctx.Err() != nil {
				logger.Info("Context cancelled during BRPOP", "QueueConsumer", "", nil)
				return
			}

			// Unexpected error
			logger.Error("Error reading from queue", "QueueConsumer", "", err, map[string]interface{}{
				"queue": queueName,
			})
			time.Sleep(1 * time.Second) // Brief pause before retrying
			continue
		}

		// BRPOP returns [queueName, message]
		if len(result) != 2 {
			logger.Warn("Unexpected BRPOP result length", "QueueConsumer", "", map[string]interface{}{
				"result_length": len(result),
			})
			continue
		}

		messageJSON := result[1]

		// Parse the message
		var msg OrderMessage
		err = json.Unmarshal([]byte(messageJSON), &msg)
		if err != nil {
			logger.Error("Failed to parse message", "QueueConsumer", "", err, map[string]interface{}{
				"message": messageJSON,
			})
			continue
		}

		logger.Info("Message received from queue", "QueueConsumer", msg.CorrelationID, map[string]interface{}{
			"order_id":   msg.OrderID,
			"product_id": msg.ProductID,
			"quantity":   msg.Quantity,
			"queue":      queueName,
		})

		// Parse traceparent from queue payload for linked trace
		var spanOpts []trace.SpanStartOption
		if parentCtx, ok := parseTraceparent(msg.Traceparent); ok {
			spanOpts = append(spanOpts, trace.WithLinks(trace.Link{
				SpanContext: parentCtx,
			}))
			logger.Info("Trace link established from queue message", "QueueConsumer", msg.CorrelationID, map[string]interface{}{
				"linked_trace_id": parentCtx.TraceID().String(),
				"order_id":        msg.OrderID,
			})
		}

		// Start a root span for the message processing with the link
		tr := otel.Tracer("fulfillment-worker")
		msgCtx, span := tr.Start(ctx, "process-fulfillment", spanOpts...)
		span.SetAttributes(
			attribute.Int("order.id", msg.OrderID),
			attribute.Int("order.product_id", msg.ProductID),
			attribute.Int("order.quantity", msg.Quantity),
			attribute.String("queue.name", queueName),
		)

		// Process the message with the handler
		err = handler(msgCtx, msg)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			logger.Error("Handler failed to process message", "QueueConsumer", msg.CorrelationID, err, map[string]interface{}{
				"order_id":   msg.OrderID,
				"product_id": msg.ProductID,
				"quantity":   msg.Quantity,
			})
			span.End()
			// Don't crash on single message failure, continue processing
			continue
		}

		span.SetStatus(codes.Ok, "")
		span.End()

		logger.Info("Message processed successfully", "QueueConsumer", msg.CorrelationID, map[string]interface{}{
			"order_id":   msg.OrderID,
			"product_id": msg.ProductID,
			"quantity":   msg.Quantity,
		})
	}
}

// getEnv retrieves an environment variable with a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
