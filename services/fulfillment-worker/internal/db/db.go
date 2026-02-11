package db

import (
	"context"
	"fmt"
	"fulfillment-worker/internal/logger"
	"math/rand"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool creates a new PostgreSQL connection pool with retry logic
func NewPool(ctx context.Context) (*pgxpool.Pool, error) {
	host := getEnv("POSTGRES_HOST", "localhost")
	port := getEnv("POSTGRES_PORT", "5432")
	user := getEnv("POSTGRES_USER", "orderuser")
	password := getEnv("POSTGRES_PASSWORD", "orderpass")
	dbname := getEnv("POSTGRES_DB", "orderdb")

	connString := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable pool_max_conns=5 pool_min_conns=1",
		host, port, user, password, dbname,
	)

	maxRetries := 5
	retryDelay := 2 * time.Second

	var pool *pgxpool.Pool
	var err error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		logger.Info("Connecting to PostgreSQL", "DatabasePool", "", map[string]interface{}{
			"attempt":     attempt,
			"max_retries": maxRetries,
			"host":        host,
			"port":        port,
			"database":    dbname,
		})

		pool, err = pgxpool.New(ctx, connString)
		if err != nil {
			logger.Error("Failed to create connection pool", "DatabasePool", "", err, map[string]interface{}{
				"attempt": attempt,
			})
			if attempt < maxRetries {
				logger.Info("Retrying PostgreSQL connection", "DatabasePool", "", map[string]interface{}{
					"delay_seconds": retryDelay.Seconds(),
				})
				time.Sleep(retryDelay)
				continue
			}
			return nil, fmt.Errorf("failed to create connection pool after %d attempts: %w", maxRetries, err)
		}

		// Test the connection
		err = pool.Ping(ctx)
		if err != nil {
			logger.Error("Failed to ping PostgreSQL", "DatabasePool", "", err, map[string]interface{}{
				"attempt": attempt,
			})
			pool.Close()
			if attempt < maxRetries {
				logger.Info("Retrying PostgreSQL connection", "DatabasePool", "", map[string]interface{}{
					"delay_seconds": retryDelay.Seconds(),
				})
				time.Sleep(retryDelay)
				continue
			}
			return nil, fmt.Errorf("failed to ping database after %d attempts: %w", maxRetries, err)
		}

		logger.Info("PostgreSQL connection established successfully", "DatabasePool", "", nil)
		return pool, nil
	}

	return nil, fmt.Errorf("failed to connect to PostgreSQL after %d attempts", maxRetries)
}

// UpdateOrderStatus updates the status of an order
func UpdateOrderStatus(ctx context.Context, pool *pgxpool.Pool, orderID int, status string) error {
	query := "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2"
	id := fmt.Sprintf("%d", orderID)

	logger.Info("Updating order status", "OrdersTable", id, map[string]interface{}{
		"order_id": orderID,
		"status":   status,
	})

	// Simulate database write latency (~2% of the time)
	if rand.Float64() < 0.02 {
		latencyMs := 100 + rand.Intn(300)
		logger.Warn("Database write latency elevated", "OrdersTable", id, map[string]interface{}{
			"latency_ms": latencyMs,
		})
	}

	result, err := pool.Exec(ctx, query, status, orderID)
	if err != nil {
		logger.Error("Failed to update order status", "OrdersTable", id, err, map[string]interface{}{
			"order_id": orderID,
			"status":   status,
		})
		return fmt.Errorf("failed to update order status: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		logger.Warn("No rows affected when updating order status", "OrdersTable", id, map[string]interface{}{
			"order_id": orderID,
			"status":   status,
		})
		return fmt.Errorf("order %d not found", orderID)
	}

	logger.Info("Order status updated successfully", "OrdersTable", id, map[string]interface{}{
		"order_id":      orderID,
		"status":        status,
		"rows_affected": rowsAffected,
	})

	return nil
}

// GetOrder retrieves an order by ID
func GetOrder(ctx context.Context, pool *pgxpool.Pool, orderID int) (map[string]interface{}, error) {
	query := "SELECT id, product_id, quantity, status, created_at FROM orders WHERE id = $1"
	id := fmt.Sprintf("%d", orderID)

	logger.Info("Fetching order", "OrdersTable", id, map[string]interface{}{
		"order_id": orderID,
	})

	var ordID, productID, quantity int
	var status string
	var createdAt time.Time

	err := pool.QueryRow(ctx, query, orderID).Scan(&ordID, &productID, &quantity, &status, &createdAt)
	if err != nil {
		logger.Error("Failed to fetch order", "OrdersTable", id, err, map[string]interface{}{
			"order_id": orderID,
		})
		return nil, fmt.Errorf("failed to fetch order: %w", err)
	}

	order := map[string]interface{}{
		"id":         ordID,
		"product_id": productID,
		"quantity":   quantity,
		"status":     status,
		"created_at": createdAt,
	}

	logger.Info("Order fetched successfully", "OrdersTable", id, map[string]interface{}{
		"order_id": orderID,
		"status":   status,
	})

	return order, nil
}

// getEnv retrieves an environment variable with a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
