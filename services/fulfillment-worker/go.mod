module fulfillment-worker

go 1.22

require (
	github.com/jackc/pgx/v5 v5.5.1
	github.com/prometheus/client_golang v1.20.5
	github.com/redis/go-redis/v9 v9.4.0
	go.opentelemetry.io/otel v1.24.0
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp v1.24.0
	go.opentelemetry.io/otel/sdk v1.24.0
	go.opentelemetry.io/otel/trace v1.24.0
)
