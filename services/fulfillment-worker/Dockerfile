# Multi-stage build for Go service
# Stage 1: Builder
FROM golang:1.22-alpine AS builder

# Install git (required for go mod download)
RUN apk add --no-cache git

WORKDIR /app

# Copy dependency files
COPY go.mod ./
COPY go.sum* ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Ensure go.sum is up to date
RUN go mod tidy

# Build the binary
# CGO_ENABLED=0 for static binary, GOOS=linux for Linux target
RUN CGO_ENABLED=0 GOOS=linux go build -o /worker ./cmd/worker/

# Stage 2: Runtime
FROM alpine:3.19

# Install ca-certificates for HTTPS connections
RUN apk add --no-cache ca-certificates

# Copy binary from builder stage
COPY --from=builder /worker /worker

# Expose metrics port
EXPOSE 2112

# Run the worker
CMD ["/worker"]
