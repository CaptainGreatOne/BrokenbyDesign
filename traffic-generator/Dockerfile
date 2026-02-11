FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm install --production

# Copy source code
COPY src/ /app/src/

# Expose control server port
EXPOSE 8089

# Start the traffic generator
CMD ["node", "src/server.js"]
