# Stage 1: Build observability
FROM node:20-alpine AS observability-builder

WORKDIR /observability

COPY observability/package*.json ./
COPY observability/tsconfig.json ./
COPY observability/index.ts ./
COPY observability/log ./log
COPY observability/metrics ./metrics
RUN npm install

RUN npm run build

# Stage 2: Build gateway
FROM node:20-alpine AS builder

WORKDIR /app

# Копируй observability результаты
COPY --from=observability-builder /observability/dist ./observability/dist
COPY --from=observability-builder /observability/node_modules ./observability/node_modules

# Копируй gateway файлы ДО npm install
COPY back/gateway/package*.json ./
COPY back/gateway/tsconfig.json ./
COPY back/gateway/src ./src

# Установи зависимости
RUN npm install

# Собери TypeScript
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/observability/dist ./observability/dist
COPY --from=builder /app/observability/node_modules ./observability/node_modules
COPY back/gateway/package*.json ./

EXPOSE 3000
CMD ["npm", "start"]
