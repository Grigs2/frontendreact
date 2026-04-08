# Estágio 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Instala dependências necessárias para o ambiente Linux
RUN apk add --no-cache python3 make g++

# Copia arquivos de dependência
COPY package*.json ./

# Instala dependências (usando o legacy para evitar conflitos de versão)
RUN npm install --legacy-peer-deps

# Copia o restante do código
COPY . .

# Comando para exportar para Web
# Adicionamos o --clear para evitar lixo de cache no build
RUN npx expo export:web --clear

# Estágio 2: Servidor Nginx
FROM nginx:alpine
# O Expo 55/React Native 0.83 gera por padrão a pasta 'dist' ou 'web-build'
# Vamos garantir que estamos pegando a pasta correta
COPY --from=build /app/dist /usr/share/nginx/html
# Caso o comando acima falhe, tente trocar /app/dist por /app/web-build
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]