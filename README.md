# Tio da Perua - App Mobile

Aplicativo mobile de transporte escolar desenvolvido com **React Native** e **Expo**.

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 20
- [Expo Go](https://expo.dev/go) instalado no celular (Android ou iOS)

## Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd frontend_tio_da_perua

# Instale as dependências
npm install
```

## Executando o projeto

```bash
npx expo start
```

Um QR code será exibido no terminal. Para abrir no celular:

- **Android**: abra o app **Expo Go** e escaneie o QR code.
- **iOS**: escaneie o QR code com a câmera e abra o link no Expo Go.

> Certifique-se de que o celular e o computador estão na **mesma rede Wi-Fi**.

### Outros comandos

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor de desenvolvimento |
| `npm run android` | Abre diretamente no emulador/dispositivo Android |
| `npm run ios` | Abre diretamente no simulador iOS (macOS) |
| `npm run web` | Abre no navegador |

## Estrutura do projeto

```
├── App.tsx                    # Entry point (navegação + fontes)
├── app.json                   # Configuração do Expo
├── assets/                    # Ícones, splash screen e logo
├── src/
│   ├── types.ts               # Tipos compartilhados (UserRole)
│   ├── types/                 # Declarações de tipos (.d.ts)
│   ├── navigation/            # Definição das rotas (RootStackParamList)
│   ├── components/            # Componentes reutilizáveis (Logo, etc.)
│   └── screens/               # Telas do app (Login, placeholders)
└── mockup/                    # Protótipo web (ignorado pelo git)
```

## Tecnologias

- **Expo** ~55 — plataforma de desenvolvimento React Native
- **React Native** 0.83 — framework mobile
- **React Navigation** 7 — navegação entre telas
- **@expo-google-fonts/inter** — tipografia
- **@expo/vector-icons** — ícones (Feather)
- **TypeScript** ~5.9
