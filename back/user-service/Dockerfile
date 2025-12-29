#base stage
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci || echo "No dependencies yet"

# prod stage 
FROM base AS prod

WORKDIR /app

COPY . .

RUN npm run build || echo "Build skipped" 

EXPOSE 3002

CMD ["npm", "run", "start"]
