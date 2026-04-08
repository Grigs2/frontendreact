# Estágio 1: Build
FROM node:20-slim AS build
WORKDIR /app

# Instala ferramentas essenciais
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Aumentamos a memória do Node e pedimos o log detalhado
ENV NODE_OPTIONS="--max-old-space-size=4096"
# ... (mantenha o início igual)

RUN npx expo export --platform web --non-interactive

# ... (mantenha o estágio de build igual)

# Estágio 2: Servidor Nginx
# ... Estágio de build anterior igual ...

FROM nginx:alpine
# Configuração para evitar tela branca em rotas internas
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]