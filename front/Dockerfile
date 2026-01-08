FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --verbose --retry 5

COPY tsconfig.json tailwind.config.js ./ 
COPY src ./src
COPY styles ./styles
COPY index.html ./
COPY favicon.ico ./

RUN npm run build

# --- production stage ---
FROM nginx:alpine

RUN apk add --no-cache openssl

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN mkdir -p /etc/nginx/ssl

COPY --from=build /app/index.html /usr/share/nginx/html/index.html
COPY --from=build /app/dist /usr/share/nginx/html/dist
COPY --from=build /app/favicon.ico /usr/share/nginx/html/favicon.ico

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080 8443

ENTRYPOINT ["/entrypoint.sh"]
