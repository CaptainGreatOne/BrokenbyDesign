package metrics

import (
	"fmt"
	"log"
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// OrdersProcessed tracks the total number of orders processed by the fulfillment worker
var OrdersProcessed = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "orders_processed_total",
		Help: "Total orders processed by fulfillment worker",
	},
	[]string{"status"},
)

// ProcessingDuration tracks the time spent processing an order
var ProcessingDuration = promauto.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "order_processing_duration_seconds",
		Help:    "Time spent processing an order",
		Buckets: prometheus.DefBuckets,
	},
	[]string{"status"},
)

// QueueDepth tracks the current depth of the fulfillment queue (for future use)
var QueueDepth = promauto.NewGauge(
	prometheus.GaugeOpts{
		Name: "fulfillment_queue_depth",
		Help: "Current depth of the fulfillment queue",
	},
)

// StartMetricsServer starts the HTTP server for Prometheus metrics
func StartMetricsServer(port int) {
	mux := http.NewServeMux()

	// Register metrics endpoint
	mux.Handle("/metrics", promhttp.Handler())

	// Register health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	addr := fmt.Sprintf(":%d", port)
	log.Printf("Metrics server starting on port %d", port)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Failed to start metrics server: %v", err)
	}
}
