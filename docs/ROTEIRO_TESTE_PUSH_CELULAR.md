# Roteiro de teste: notificações push no celular

Objetivo: validar que o celular recebe notificações push (na área de notificações do Android/iOS) com o app **fechado**, e que o toque abre a tela correta.

Tipo de notificação: **push notification remota**, enviada pelo Expo Push Service (que repassa para FCM no Android e APNs no iOS).

---

## 1. Ajustes necessários antes do teste

| # | Item | Situação encontrada | Ação |
|---|------|---------------------|------|
| 1 | Expo Go não recebe push remoto | Desde o SDK 53 o Expo Go no Android não recebe push remoto | Gerar um **development build** com EAS (`eas build --profile development --platform android`) e instalar o APK no celular |
| 2 | URL da API no `.env.local` | O arquivo define `EXPO_PUBLIC_API_URL` com `https://<IP>/TioDaPerua/api`, sem porta. O back-end não tem configuração de TLS e sobe em HTTP na porta **8080** por padrão | Ajustar para `http://<IP_DA_MAQUINA>:8080/TioDaPerua/api` (ou configurar um proxy HTTPS). Rebuild do app após a mudança, pois a variável é lida em tempo de build |
| 3 | Tráfego HTTP no Android | Com HTTP, o build precisa permitir texto claro na rede | Builds de desenvolvimento do Expo costumam aceitar; se a chamada falhar, verificar `usesCleartextTraffic` |
| 4 | Back-end não inicia sem variáveis | `DOCUMENTOS_CHAVE_BASE64` é obrigatória (chave AES-256 em Base64, 32 bytes). `JWT_SECRET_BASE64` é necessária para login | Definir as duas variáveis antes de subir o back-end |
| 5 | Banco de dados | Padrão é PostgreSQL em `localhost:5432` com o banco `TioDaPerua` | Subir o PostgreSQL e confirmar a conexão. `ddl-auto=update` cria as tabelas no primeiro start |
| 6 | Push habilitado | Não há `app.push.*` no `application.properties`. O padrão `true` está no construtor de `PushService` (`@Value("${app.push.enabled:true}")`) | Não alterar; apenas garantir que a propriedade `app.push.enabled` não esteja definida como `false` no ambiente |
| 7 | Usuários de teste | Precisa de pelo menos 2 contas: um remetente (Motorista ou Responsável) e um destinatário | Criar as contas pelo app ou pelo back-end. Para o teste de viagem, o vínculo motorista/aluno/responsável precisa existir |
| 8 | Projeto EAS | `pushService.ts` só usa `EXPO_PUBLIC_EAS_PROJECT_ID`. Sem ela, chama `getExpoPushTokenAsync(undefined)` e a falha é engolida pelo `catch` | Definir `EXPO_PUBLIC_EAS_PROJECT_ID` no `.env.local` com o `extra.eas.projectId` do `app.json` e gerar o build novamente |
| 9 | Documentação desatualizada | `Docs/IMPLEMENTACAO_NOTIFICACOES_HISTORICO_TERMOS.md` (back-end) diz "Sem commit e sem push", e o `GEMINI.md` menciona IP fixo e telas com mock | Não bloqueia o teste; atualizar depois |

Não foi possível executar o teste de ponta a ponta nesta sessão. A verificação foi feita por leitura do código nas branches `feat/docs-images` (front) e `homologacao` (back, commit `274508d`).

---

## 2. Pré-requisitos

- [ ] Back-end (`homologacao`) rodando, com PostgreSQL ativo e variáveis `JWT_SECRET_BASE64` e `DOCUMENTOS_CHAVE_BASE64` definidas
- [ ] Celular e computador na mesma rede Wi-Fi
- [ ] Porta 8080 liberada no firewall do computador
- [ ] `.env.local` com `EXPO_PUBLIC_API_URL=http://<IP_DO_COMPUTADOR>:8080/TioDaPerua/api`
- [ ] Development build instalado no celular
- [ ] Duas contas de teste criadas (A = remetente, B = destinatário)
- [ ] Permissão de notificações concedida no celular (Configurações do app)

---

## 3. Casos de teste

### CT-01: Registro do token do dispositivo

1. Abrir o app no celular e fazer login com a conta **B** (destinatário).
2. Aceitar a permissão de notificações quando solicitada.
3. **Esperado:** o app chama `POST /Notificacao/Dispositivos` com o token `ExponentPushToken[...]`.
4. Conferir no banco, na tabela da entidade `DispositivoPush` do back-end, que existe 1 registro ativo para a conta B.

### CT-02: Push com o app fechado (envio manual)

1. Com a conta B logada no celular, **fechar o app por completo** (remover da lista de apps recentes).
2. No computador (ou em outro celular), logar com a conta **A** no app e abrir **Nova Notificação**.
3. Escolher a conta B como destinatário, preencher título e mensagem (ex.: "Teste push"), e enviar.
4. **Esperado:** em poucos segundos, aparece uma notificação na barra de notificações do celular com o título e a mensagem.

### CT-03: Toque na notificação

1. Com o app ainda fechado, tocar na notificação "Teste push".
2. **Esperado:** o app abre. Se o `data` da notificação tiver rota, abre a tela correspondente (ver `PushNotificationsHandler.tsx`).

### CT-04: Push automático de viagem (opcional)

1. Com a conta B vinculada como responsável de um aluno em uma viagem, fechar o app no celular de B.
2. Com a conta A (motorista), iniciar a viagem e registrar **embarque** do aluno.
3. **Esperado:** notificação "Embarque" aparece no celular de B, mesmo com o app fechado.

### CT-05: Prioridade alta

1. Enviar um aviso de ausência ou atraso (tipo `AUSENCIA` ou `ATRASO`, prioridade alta).
2. **Esperado:** a notificação chega no canal `alertas` (Android), com som e exibição de banner.

### CT-06: Logout remove o dispositivo

1. Com a conta B logada, fazer logout no app.
2. **Esperado:** o app chama `POST /Notificacao/Dispositivos/Remover` e o token fica com `ativo = false`.
3. Enviar outra notificação manual para B.
4. **Esperado:** nenhuma notificação push chega no celular.

### CT-07: Token inválido (erro esperado)

1. Desinstalar o app do celular de B, sem fazer logout.
2. Enviar uma notificação manual para B.
3. **Esperado:** o back-end recebe `DeviceNotRegistered` do Expo e marca o token como inativo. Não deve haver erro na tela do remetente.

---

## 4. Registro do resultado

| Caso | Resultado (OK / FALHA) | Observação |
|------|------------------------|------------|
| CT-01 Registro do token | | |
| CT-02 Push com app fechado | | |
| CT-03 Toque abre o app | | |
| CT-04 Push automático de viagem | | |
| CT-05 Prioridade alta | | |
| CT-06 Logout remove dispositivo | | |
| CT-07 Token inválido | | |

## 5. Se algo falhar

- **Nenhum token registrado (CT-01):** verificar permissão de notificações e se o build é o development build, não o Expo Go.
- **Token registrado, mas nada chega (CT-02):** verificar os logs do back-end na classe `PushService` e os tickets retornados pelo Expo. Conferir se o `expoToken` começa com `ExponentPushToken[` ou `ExpoPushToken[`.
- **Erro de rede no app:** confirmar o IP, a porta 8080 e se o celular está na mesma rede.
