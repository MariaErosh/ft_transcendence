FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install || echo "No dependencies yet"

COPY . .

EXPOSE 3000


CMD ["npm", "run", "start"]
