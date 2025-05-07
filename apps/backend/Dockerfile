FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV PYTHON_SERVICE_URL=http://face-recognition:8000

# Expose the port
EXPOSE 3001

# Run the application
CMD ["node", "index.js"]
