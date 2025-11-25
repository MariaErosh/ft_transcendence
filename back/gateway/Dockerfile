#base stage
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

# prod stage
FROM base AS prod

WORKDIR /app

COPY package*.json ./

# Install tools needed for bufferutil (node-gyp)
RUN apk add --no-cache \
    && npm install


# RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
