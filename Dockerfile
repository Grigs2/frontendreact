# Estágio 1: Build da aplicação Expo Web
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Gera a pasta /dist com os arquivos web
RUN npx expo export:web

# Estágio 2: Servidor para entregar a página
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]