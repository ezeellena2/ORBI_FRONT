# syntax=docker/dockerfile:1
#
# Imagen del frontend: compila la SPA con Node y la sirve con nginx (que ademas
# reenvia /api al gateway). Contexto = raiz de TracAutoFrontV2:
#   docker build -t orbi-web .

# ---- Etapa 1: build de la SPA con Node ----
FROM node:22-alpine AS build
WORKDIR /app

# Primero package.json + lock para cachear la instalacion de dependencias.
COPY package.json package-lock.json ./
RUN npm ci

# Ahora el codigo y compilamos (tsc + vite build -> /app/dist estatico).
# VITE_API_BASE_URL queda vacio (default) => la app pega a /api del MISMO origen (nginx).
COPY . .
RUN npm run build

# ---- Etapa 2: nginx sirve el estatico + reenvia /api al gateway ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# La imagen oficial de nginx ya arranca el server; no hace falta ENTRYPOINT.
