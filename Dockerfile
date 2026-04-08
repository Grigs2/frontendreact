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
RUN npx expo export --platform web --non-interactive --clear
# Se o comando acima falhar, o log agora será muito mais detalhado no GitHub

# Estágio 2: Servidor Nginx
FROM nginx:alpine
# No Expo moderno, a pasta de saída é a 'dist'
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]