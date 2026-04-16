# Use Node.js 18 as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm ci && npm run build

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "index.js"] 