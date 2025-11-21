#base stage
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

# prod stage
FROM base AS prod

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
