FROM node:18-alpine

WORKDIR /app

COPY package.json ./

RUN npm install || echo "No dependencies yet"

COPY . .

CMD ["echo", "Backend placeholder - no server yet"]
