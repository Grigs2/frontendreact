# Resumo do Projeto para Implementação Docker - Tio da Perua

Este documento descreve as dependências, versões e requisitos técnicos do projeto frontend "Tio da Perua", visando orientar a implementação de um ambiente Dockerizado e identificar possíveis incompatibilidades com a visualização Web.

## 1. Tecnologias e Dependências Principais

O projeto utiliza o ecossistema Expo/React Native em versões recentes.

### Core
- **Node.js:** >= 20 (Recomendado)
- **React:** 19.2.0
- **React Native:** 0.83.6
- **Expo:** ~55.0.25
- **TypeScript:** ~5.9.2

### Bibliotecas de Terceiros
- **Navegação:** `@react-navigation/native` (^7.1.6) e `@react-navigation/native-stack` (^7.3.6)
- **Ícones:** `@expo/vector-icons` (~15.0.0) e `lucide-react-native` (^1.7.0)
- **Persistência Local:** `@react-native-async-storage/async-storage` (^2.2.0)
- **Comunicação API:** `axios` (^1.16.1)
- **UI/Layout:** `react-native-safe-area-context` (~5.6.2), `react-native-screens` (~4.23.0), `react-native-svg` (15.15.3)
- **Web:** `react-native-web` (^0.21.2), `@expo/metro-runtime` (~55.0.9)

## 2. Requisitos para Dockerização

Para rodar este projeto em um container Docker, os seguintes pontos devem ser configurados:

### Portas Necessárias
- **8081:** Porta padrão do Metro Bundler (Expo). Deve ser exposta para comunicação com o host.
- **19000 - 19006:** Portas utilizadas pelo Expo Go e ferramentas de desenvolvimento (caso o Docker seja usado para desenvolvimento mobile direto).

### Configuração de Rede (CORS e Endereços)
- O arquivo `src/services/api.ts` define a `BASE_URL` como `http://localhost:8080/TioDaPerua/api`. 
- **Incompatibilidade:** No Docker, `localhost` refere-se ao próprio container. Se a API estiver rodando fora do container (no host), o frontend não conseguirá acessá-la via `localhost`. É necessário configurar o IP da máquina host ou usar o nome do serviço caso a API também esteja no Docker (Docker Compose).

### Variáveis de Ambiente
- Recomenda-se o uso de `EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0` para permitir acesso externo ao painel do Metro.

## 3. Possíveis Incompatibilidades com Visualização Web via Docker

Embora o projeto seja compatível com a Web, os seguintes componentes e funções podem apresentar comportamentos inesperados ou limitações:

### Persistência (AsyncStorage)
- O `AsyncStorage` funciona na Web através do `localStorage` do navegador. Em ambientes Docker, certifique-se de que o navegador tem permissão para persistir dados, caso contrário, o login (armazenado no contexto e possivelmente no storage) não será mantido entre recarregamentos.

### Navegação (React Navigation)
- A navegação em pilhas (`native-stack`) funciona bem no Web, mas a gestão de URLs (Deep Linking) no Docker pode exigir uma configuração extra de `linking` no `NavigationContainer` para que as rotas sejam refletidas na barra de endereços do navegador de forma amigável.

### Componentes Nativos e Feedback Visual
- **Alert.alert:** No Web, o `Alert.alert` do React Native cai para o `window.alert` padrão do navegador, que é síncrono e bloqueante, diferindo da experiência visual do mobile.
- **Modais:** O componente `Modal` pode ter comportamentos de sobreposição variados no Web dependendo da versão do `react-native-web`.
- **Status Bar e Splash Screen:** As bibliotecas `expo-status-bar` e `expo-splash-screen` têm efeito limitado ou nulo na visualização Web padrão.

### Hardware e APIs de Dispositivo
- Embora não detectamos uso intensivo de Câmera ou GPS no código atual, qualquer implementação futura dessas APIs exigirá HTTPS para funcionar no navegador via Docker, devido às políticas de segurança de "Secure Contexts".

### Networking no Browser
- Requisições feitas via `axios` no browser estão sujeitas a políticas de **CORS** (Cross-Origin Resource Sharing). A API backend deve estar configurada para permitir requisições vindas da origem onde o Docker está servindo o frontend (ex: `http://localhost:8081`).

## 4. Comandos Recomendados para Dockerfile

```dockerfile
# Exemplo de comandos base
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8081
CMD ["npx", "expo", "start", "--web"]
```
