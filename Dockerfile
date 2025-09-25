# --------- build (Node) ----------
FROM node:20-alpine AS build
WORKDIR /app

# instala dependências
COPY package*.json ./
RUN npm install

# copia código e cria build
COPY . .
RUN npm run build

# --------- run (Nginx) -----------
FROM nginx:1.25-alpine

# Cloud Run usa porta 8080
COPY nginx.conf /etc/nginx/conf.d/default.conf

# arquivos estáticos gerados pelo Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx","-g","daemon off;"]

