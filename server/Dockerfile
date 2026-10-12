# ==============================================================================
# SmartDC-Energy — Express SCADA Historian Gateway Dockerfile
# Production-ready Node.js container
# ==============================================================================
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for optimal Docker layer caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Run as non-privileged node user for container security
USER node

CMD ["node", "src/server.js"]
