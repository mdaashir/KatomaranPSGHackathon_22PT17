FROM node:20-alpine as build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve to run the application
RUN npm install -g serve

# Copy build files from the build stage
COPY --from=build /app/dist /app/dist

# Expose the port
EXPOSE 3000

# Run the application
CMD ["serve", "-s", "dist", "-l", "3000"]
