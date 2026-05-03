# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine
# Copy built static assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 for the Nginx server
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
