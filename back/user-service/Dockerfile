FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install || echo "No dependencies yet"

COPY . .

RUN npm run build || echo "Build skipped" 

EXPOSE 3002

CMD ["npm", "run", "start"]
