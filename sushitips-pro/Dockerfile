# Step 1: Build the React/Vite application
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Serve using Nginx with dynamic port routing
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# This magical line updates Nginx to listen to whatever port Cloud Run provides at runtime
CMD exec nginx -g 'daemon off;' -c /etc/nginx/nginx.conf & sed -i "s/listen       80;/listen ${PORT};/" /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'
