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

# Estágio 2: Servidor Nginx
FROM nginx:alpine
# Tentamos copiar da pasta 'dist', que é o novo padrão do Expo
COPY --from=build /app/dist /usr/share/nginx/html
# Se o erro continuar, mude a linha acima para:
# COPY --from=build /app/web-build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]