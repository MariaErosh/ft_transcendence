FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY tsconfig.json tailwind.config.js ./ 
COPY src ./src
COPY styles ./styles
COPY index.html ./
COPY favicon.ico /usr/share/nginx/html/favicon.ico

RUN npm run build

# --- production stage ---
FROM nginx:alpine


COPY --from=build /app/index.html /usr/share/nginx/html/index.html
COPY --from=build /app/dist /usr/share/nginx/html/dist

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
