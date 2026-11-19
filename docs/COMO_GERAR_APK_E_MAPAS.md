# Como gerar o APK, mapas e localização (19/11/2026)

Este guia explica como gerar o APK Android do Tio da Perua, como testar no celular e o que mudou no app para o mapa, a localização e a previsão de chegada funcionarem.

> **Chaves e senhas não ficam aqui.** Os repositórios no GitHub são públicos: qualquer pessoa pode ler este arquivo. As credenciais (chaves do Google, conta Google e conta Expo) ficam em `docs/CREDENCIAIS.local.md`, que existe só no computador de quem configurou e é ignorado pelo Git. Peça o conteúdo a quem tem o arquivo.

---

## 1. Visão geral

| Peça | Onde fica | Para quê |
|---|---|---|
| Conta Expo (`tiodaperua2626s-team`) | expo.dev | Gera o APK na nuvem (EAS Build) e manda atualizações (EAS Update) |
| Projeto Expo `tio-da-perua` | `app.json` → `extra.eas.projectId` | Liga esta pasta ao projeto no Expo |
| Chave **"Tio da Perua - App Android"** | Variável secreta `GOOGLE_MAPS_ANDROID_KEY` no EAS | Desenha o mapa do Google no APK |
| Chave **"Tio da Perua - Backend"** | Variável `GOOGLE_MAPS_API_KEY` no backend (Codespace) | Converte endereços em coordenadas e calcula rota e tempo |
| Endereço da API | Variável `EXPO_PUBLIC_API_URL` no EAS (ambiente `preview`) | O APK sabe onde está o backend |

Arquivos de configuração do build:

- `app.json`:
  - nome "Tio da Perua";
  - pacote Android `br.com.tiodaperua`;
  - ícones, tela de abertura e atualizações automáticas;
  - plugin `expo-build-properties`, que desliga a minificação: veja a seção 6.
- `app.config.js`: lê a chave do Maps de `GOOGLE_MAPS_ANDROID_KEY`. Assim a chave nunca fica salva no repositório.
- `eas.json`: modos de build `development`, `preview` (APK para instalar) e `production`, cada um no seu canal de atualização.

---

## 2. Preparar o computador (uma vez só)

1. Instale o Node.js e rode `npm install` na pasta `frontendreact`.
2. Entre na conta Expo:
   ```powershell
   npx eas-cli@latest login
   ```
   Se preferir digitar só `eas`, instale a ferramenta com `npm install -g eas-cli`. Depois disso, `eas ...` e `npx eas-cli@latest ...` são a mesma coisa.
3. Confira as variáveis do projeto no Expo:
   ```powershell
   npx eas-cli@latest env:list preview
   ```
   Devem aparecer `EXPO_PUBLIC_API_URL` e `GOOGLE_MAPS_ANDROID_KEY`. A chave aparece como `*****` porque é secreta.

Se precisar criar ou trocar uma variável:

```powershell
npx eas-cli@latest env:create --name GOOGLE_MAPS_ANDROID_KEY --visibility secret
```
```powershell
npx eas-cli@latest env:update --name GOOGLE_MAPS_ANDROID_KEY
```
```powershell
npx eas-cli@latest env:create --name EXPO_PUBLIC_API_URL --environment preview --visibility plaintext
```

Nas perguntas do comando:
- marque os ambientes **development** e **preview**;
- na pergunta **visibility**, escolha **Secret** para a chave. O EAS não deixa transformar uma variável secreta em texto comum.

Use a chave **"App Android"**, nunca a do Backend. Com a chave do Backend o mapa fica bege, só com o logo do Google: foi o que aconteceu no primeiro APK.

---

## 3. Gerar o APK

```powershell
npx eas-cli@latest build --profile preview --platform android
```

- O build roda na nuvem do Expo e leva de 15 a 20 minutos. No fim aparece um **link** e um **QR code** para baixar o APK.
- No primeiro build ele pergunta se pode criar a chave de assinatura (keystore). Responda **Yes**: o EAS guarda essa chave.
- Se perguntar "Install and run the Android build on an emulator?", responda **No**.
- O EAS envia os arquivos da pasta do jeito que estão, com as mudanças não commitadas incluídas.

**Instalar no celular:**
1. Abra o link no celular e baixe o APK.
2. Permita "instalar apps de fontes desconhecidas" quando o Android pedir.
3. **Desinstale a versão antiga antes**, quando a anterior foi assinada de outro jeito ou não abre.

O mesmo link serve para o grupo inteiro instalar.

**Avisos:**
- O endereço do backend fica gravado dentro do APK. Se o Codespace do backend mudar de endereço ou for apagado, atualize `EXPO_PUBLIC_API_URL` e gere outro APK.
- O backend precisa estar ligado, com a porta **8080 Pública**.

---

## 4. Atualizar o app sem gerar outro APK (EAS Update)

Para mudanças só de tela ou lógica (arquivos `.ts` e `.tsx`):

```powershell
npx eas-cli@latest update --channel preview --message "o que mudou"
```

O app baixa a atualização quando é aberto. Às vezes ela só aparece na segunda abertura.

**Precisa de APK novo quando:**
- instalou uma biblioteca nova;
- mudou o `app.json` ou o `app.config.js` (ícone, permissões, plugins);
- trocou a chave do Maps;
- mudou o campo `version`.

---

## 5. Testar no celular sem APK (Expo Go)

1. Instale o **Expo Go** no celular (Play Store ou App Store).
2. **No Codespace do frontend**, onde o terminal mostra `/workspaces/frontendreact`:
   ```bash
   git pull && npm install
   ```
   ```bash
   npx expo start --go --tunnel --clear
   ```
   O `--go` é necessário porque o projeto tem `expo-dev-client`. Sem ele, o QR code abre o modo de APK de desenvolvimento.
3. Leia o QR code com o Expo Go. No iPhone, leia com a câmera.
4. O `.env.local` do frontend precisa apontar para o backend:
   ```
   EXPO_PUBLIC_API_URL=https://<codespace-do-backend>-8080.app.github.dev/TioDaPerua/api
   ```

**Limitações do Expo Go:**
- O mapa usa a chave do próprio Expo: Google Maps no Android e Apple Maps no iPhone.
- Notificações push (com o app fechado) não funcionam no Android.

**No navegador** (`npx expo start --web`), o mapa é o OpenStreetMap, sem a linha da rota. A previsão de chegada aparece em texto.

**iPhone:** instalar o app "de verdade" exige a conta de desenvolvedor Apple (US$ 99/ano). Para testar e apresentar, use o Expo Go.

---

## 6. Problemas já resolvidos (e como reconhecer)

| Sintoma | Causa | Solução |
|---|---|---|
| APK fecha ao abrir ("apresenta falhas contínuas"), com o erro `Failed to create an instance of class androidx.work.impl.WorkDatabase` | O Expo 58 liga a minificação (R8), que apaga uma classe do WorkManager usada pela biblioteca de mapas | No `app.json`, o `expo-build-properties` usa `enableMinifyInReleaseBuilds: false` e uma regra que protege as classes do WorkManager (`extraProguardRules`) |
| Mapa bege, só com o logo do Google | A chave no EAS era a do **Backend** (só Geocoding e Routes), e não a do App Android | `env:update` com a chave "App Android" e um APK novo |
| Responsável vê "Localização indisponível" | (1) Faltava `GPS_CONSENT_VERSION` no backend. (2) O motorista não tinha onde autorizar. (3) A regra exigia a autorização de **todos** os responsáveis | Veja a seção 7 |
| `eas: command not found` | O `eas-cli` não está instalado | Use `npx eas-cli@latest ...` ou rode `npm install -g eas-cli` |
| `npm`/`npx: command not found` no Codespace | O terminal está no Codespace do **backend** | Rode os comandos do app no Codespace `frontendreact` |
| `python3 seed_perfis.py` com `No module named 'json'` | O Python do Codespace do backend está incompleto | Rode o seed de outro lugar, apontando para o backend: `python seed_perfis.py --url https://<codespace>-8080.app.github.dev/TioDaPerua/api` |

---

## 7. O que mudou no app

### Ícone e tela de abertura
- Os ícones do Expo (o "A" azul) foram trocados pela logo do Tio da Perua, em `assets/`:
  - **ícone:** o pino com a perua, sem o texto, que ficaria ilegível pequeno;
  - **tela de abertura:** a logo completa, com o nome.
- A logo original tem 500×500 pixels. Com a logo em alta resolução dá para gerar ícones mais nítidos.

### Localização (o responsável vê a perua)
- **Motorista:** na tela de atendimento aparece o cartão **"Compartilhar sua localização"**, com o botão **Permitir**. Basta autorizar uma vez; para desligar: Perfil → Configurações.
- **Responsável:** no acompanhamento aparece **"Ver a perua no mapa"**, com o botão **Permitir e ver no mapa**. A chave "Compartilhar localização", nos dados do aluno, agora mostra o estado salvo.
- **Regra nova:**
  - o motorista envia a posição com o próprio consentimento;
  - cada responsável vê o mapa depois de autorizar para o seu aluno;
  - um responsável que não autorizou não bloqueia os outros.

### Rota e previsão de chegada
- **Motorista ("Waze"):**
  - no mapa: a linha azul da rota, a perua amarela e as paradas pendentes numeradas, com o destino atual em destaque;
  - o quadro escuro mostra a próxima manobra ("Vire à direita na R. X · 230 m"), "Chega em 7 min · 07:12 · 2,5 km" e a parada seguinte;
  - os botões **Abrir no Maps** e **Abrir no Waze** levam à navegação por voz até a parada.
- **Responsável ("Uber"):**
  - no mapa: a perua e a rota até a parada do filho;
  - com o aluno esperando, a parada é a casa (na ida) ou a escola (na volta);
  - com o aluno embarcado, é a escola (na ida) ou a casa (na volta);
  - o cartão mostra "Chega em 8 min", com a previsão e a distância;
  - **o responsável não recebe os endereços das outras famílias.**
- A rota é recalculada a cada minuto e a cada embarque ou desembarque.

### Arquivos

| Arquivo | O que faz |
|---|---|
| `src/components/TripMap.tsx` | Desenha a rota, o marcador da perua e as paradas; modo "seguir" (motorista) ou "enquadrar" (responsável) |
| `src/hooks/useRotaViagem.ts` (novo) | Busca a rota a cada minuto |
| `src/utils/rota.ts` (novo) | Decodifica o desenho da rota do Google; formata tempo e distância |
| `src/screens/DriverAttendanceScreen.tsx` | Consentimento do motorista, rota, previsão e botões de navegação |
| `src/screens/GuardianMonitoringScreen.tsx` | Consentimento do responsável, rota até o aluno e previsão |
| `src/screens/GuardianDependentDetailScreen.tsx` | A chave de localização carrega o estado atual |
| `src/services/localizacaoService.ts`, `src/services/api.ts`, `src/types.ts` | Novas chamadas (`rota`, `consentimentoDependente`) e tipos |
| `app.json`, `app.config.js`, `eas.json`, `assets/*` | Build, chave do Maps, ícones e correção do APK que fechava |

As mudanças do backend estão em `BackEndJava/Docs/IMPLEMENTACAO_LOCALIZACAO_E_ROTAS.md`.

---

## 8. O que ainda falta configurar

1. **No Codespace do backend:** criar o secret `GOOGLE_MAPS_API_KEY` com a chave "Tio da Perua - Backend" e reiniciar o backend. Sem ele, as telas mostram "o servidor ainda não tem a chave do Google Maps" e não há rota.
2. **Proteger a chave "App Android":** em Restrição de app → Apps Android, informar o pacote `br.com.tiodaperua` e o SHA-1 que aparece em `npx eas-cli@latest credentials` (Android → preview).
3. **Trocar a chave do Backend com "Alternar chave".** Ela foi parar dentro do primeiro APK, e qualquer pessoa com o arquivo consegue extraí-la. Depois atualize o secret do backend.
4. **Custo:** Geocoding e Routes têm cota grátis mensal. Cada endereço é consultado uma vez (fica em cache no banco), e a rota de cada viagem é recalculada no máximo uma vez por minuto. O alerta de orçamento de R$ 10 continua ativo.
