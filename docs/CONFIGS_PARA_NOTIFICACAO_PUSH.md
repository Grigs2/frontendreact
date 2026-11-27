# Build Android (preview) com notificações push

Este documento descreve como gerar o APK de preview do Tio da Perua com push notifications funcionando. Os arquivos sensíveis não ficam no repositório: são enviados ao EAS como variáveis de ambiente.

## Arquivos e valores que não vão para o Git

| Item | Onde fica | Como chega ao build |
|------|-----------|---------------------|
| `google-services.json` (Firebase Android) | Raiz do projeto, no `.gitignore` | Variável de arquivo `GOOGLE_SERVICES_JSON` no EAS |
| Chave da conta de serviço FCM (JSON) | Fora do projeto | Enviada ao EAS com `eas credentials` (nunca commitar) |
| `GOOGLE_MAPS_ANDROID_KEY` | EAS (`secret`) | Variável de ambiente lida em `app.config.js` |
| `.env.local` | Raiz do projeto, no `.gitignore` | Só para uso local; o EAS não lê este arquivo |

O `app.config.js` aponta o `googleServicesFile` para `process.env.GOOGLE_SERVICES_JSON`. No EAS, essa variável recebe o caminho do arquivo. Localmente, cai para `./google-services.json`.

## Pré-requisitos

- Acesso ao projeto Expo/EAS (`npx eas-cli login`).
- Acesso ao projeto Firebase `tio-da-perua-fe8bf`, com o app Android `br.com.tiodaperua`.
- O arquivo `google-services.json` baixado do Firebase (Configurações do projeto > Seus apps > Android).

## Passo 1: enviar o google-services.json ao EAS (preview)

```bash
npx eas-cli env:create --environment preview --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility sensitive
```

Se a variável já existir, use `--force` para sobrescrever.

## Passo 2: variáveis públicas da preview

O `EXPO_PUBLIC_*` é gravado no JavaScript durante o build. Sem ele, o app não consegue gerar o token de push.

```bash
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_EAS_PROJECT_ID --value 6a284bc7-cc2a-4655-acf7-4591250e4ab3 --visibility plaintext
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_API_URL --value <URL_DA_API> --visibility plaintext
```

Confira o que está cadastrado:

```bash
npx eas-cli env:list preview
```

## Passo 3: chave FCM para o envio de push

O Expo precisa da chave de conta de serviço do Firebase para entregar as notificações.

1. No Firebase: Configurações do projeto > Contas de serviço > Gerar nova chave privada.
2. Envie ao EAS:
   ```bash
   npx eas-cli credentials -p android
   ```
   Selecione o perfil `preview` e a opção de FCM V1 (service account key).

Não commite o JSON da chave de serviço.

## Passo 4: gerar o build

```bash
npx eas-cli build --profile preview --platform android
```

Sempre gere um build novo depois de alterar qualquer variável `EXPO_PUBLIC_*` ou o `google-services.json`. Build em andamento não usa variáveis criadas depois que ele começou.

## Passo 5: validar no celular

1. Instale o APK e faça login.
2. Aceite a permissão de notificações.
3. Confira se o registro chegou ao back-end (`POST /Notificacao/Dispositivos`) e se a tabela `dispositivo_push` tem um registro ativo para o usuário.

Se o token não for salvo, capture os logs pelo `adb` (no computador, com o celular conectado por USB com depuração ativada):

```bash
adb logcat -c
adb logcat -s ReactNativeJS
```

Erros do tipo `Unable to get Firebase Messaging instance` indicam que o `google-services.json` não chegou ao build. Erros de `EXPO_PUBLIC_EAS_PROJECT_ID` indicam que a variável não foi criada antes do build.

## Observação sobre a URL da API

Se a API estiver no Codespaces, a porta 8080 precisa estar **pública** na aba Ports e a URL muda se o Codespace for recriado. Para usar a rede local, use `http://<IP_DO_PC>:8080/TioDaPerua/api` e gere um novo build.
