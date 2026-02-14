FROM node:20-alpine

# Install wget for health checks
RUN apk add --no-cache wget

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm install --production

# Copy source
COPY src/ ./src/

# Expose HTTP port
EXPOSE 9095

# Health check
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:9095/health || exit 1

CMD ["node", "src/server.js"]
