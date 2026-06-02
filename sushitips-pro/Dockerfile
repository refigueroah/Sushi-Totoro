# Step 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Serve the application using a stable Node production server
FROM node:20-alpine
WORKDIR /app

# Install a simple, highly efficient production server globally
RUN npm install -g serve

# Copy only the compiled production files from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the dynamic port provided by Cloud Run
EXPOSE 8080

# Run the production server, explicitly binding it to Google's dynamic port variable
CMD ["sh", "-c", "serve -s dist -l $PORT"]
