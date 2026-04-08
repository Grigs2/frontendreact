# Estágio 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./

# Instala as dependências ignorando conflitos de peer (comum no Expo)
RUN npm install --legacy-peer-deps

# Copia o restante do código
COPY . .

# Comando para exportar para Web (gera a pasta web-build)
RUN npx expo export:web

# Estágio 2: Servidor Nginx
FROM nginx:alpine
# O Expo export:web gera por padrão a pasta 'web-build'
COPY --from=build /app/web-build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]