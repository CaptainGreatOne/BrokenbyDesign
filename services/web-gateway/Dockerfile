FROM node:20-alpine

# Install wget for health checks
RUN apk add --no-cache wget

WORKDIR /app

# Copy package files
COPY services/web-gateway/package.json services/web-gateway/package-lock.json* ./

# Install production dependencies
RUN npm install --production

# Copy proto files (shared with order-api)
COPY proto/ /app/proto/

# Copy application source
COPY services/web-gateway/src/ /app/src/

# Expose HTTP port
EXPOSE 3000

# Start the server
CMD ["node", "src/server.js"]
