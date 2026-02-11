# Dockerfile for Order API microservice
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY services/order-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy proto files
COPY proto/ /app/proto/

# Create src directory for generated protobuf code
RUN mkdir -p /app/src

# Generate protobuf Python code
RUN python -m grpc_tools.protoc \
    -I/app/proto \
    --python_out=/app/src \
    --grpc_python_out=/app/src \
    /app/proto/order.proto

# Copy application source code
COPY services/order-api/src/ /app/src/

# Set Python path to find generated protobuf modules
ENV PYTHONPATH=/app/src

# Expose gRPC port
EXPOSE 50051

# Expose Prometheus metrics HTTP port
EXPOSE 8000

# Run server with unbuffered output for Docker logs
CMD ["python", "-u", "src/server.py"]
