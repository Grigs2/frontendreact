# Estágio 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Instala ferramentas de compilação necessárias para o Linux
RUN apk add --no-cache python3 make g++

# Copia dependências
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copia o código
COPY . .

# Comando robusto para exportar:
# CI=true evita que o processo pare esperando resposta do usuário
RUN CI=true npx expo export --platform web

# Estágio 2: Nginx
FROM nginx:alpine
# No Expo moderno, o comando 'export' gera a pasta 'dist'
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]