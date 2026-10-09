# Use Node.js 18 as base image
FROM node:18-alpine

# F-04: Run as non-root user for least-privilege container execution
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev) so the frontend build works
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm ci && npm run build

# Remove dev dependencies after build — production image should not include them
RUN npm ci --omit=dev

# F-04: Switch to non-root user before starting the process
USER appuser

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "index.js"] 