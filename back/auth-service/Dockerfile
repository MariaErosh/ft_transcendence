FROM node:18-bullseye

WORKDIR /app

COPY package*.json ./

RUN npm install || echo "No dependencies yet"

COPY . .

RUN npm run build || echo "Build skipped" 

EXPOSE 3001

CMD ["npm", "run", "start"]
