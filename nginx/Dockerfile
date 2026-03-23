# ============================================================
# nginx/Dockerfile — Production nginx (builds frontend + serves)
# ============================================================
# Builds the React app, then serves it via nginx.
# Also reverse-proxies /api and /ws to the backend container.
# ============================================================

# --- Stage 1: Build the React app ---
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm config set legacy-peer-deps true
RUN npm install
COPY frontend/ .
RUN npm run build

# --- Stage 2: Serve via nginx ---
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
