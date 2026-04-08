# Estágio 1: Build
FROM node:20-slim AS build
WORKDIR /app

# Instala ferramentas essenciais para compilação no Linux
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copia e instala dependências
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copia o código
COPY . .

# Variáveis de ambiente para o build do Expo
ENV NODE_ENV=production
ENV EXPO_USE_METRO=1

# Comando de exportação (forçamos o uso do Metro)
RUN npx expo export --platform web --non-interactive

# Estágio 2: Servidor Nginx
FROM nginx:alpine
# No Expo 55, o resultado vai para a pasta 'dist'
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]