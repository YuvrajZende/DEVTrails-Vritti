FROM node:20-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "index.js"]
