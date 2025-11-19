#base stage
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

# prod stage 
FROM base AS prod

WORKDIR /app

COPY package*.json ./

RUN npm install || echo "No dependencies yet"

COPY . .

RUN npm run build || echo "Build skipped" 

EXPOSE 3003

CMD ["npm", "run", "start"]
