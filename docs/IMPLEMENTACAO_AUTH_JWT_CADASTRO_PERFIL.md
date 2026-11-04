# Implementação — Autenticação JWT, Cadastro em Etapas, Recuperação de Senha e Perfil

> Documento de acompanhamento. Atualizado a cada etapa do trabalho.

- Início: 04/11/2026
- Branch do frontend: `feat/auth-jwt-cadastro-perfil` (criada a partir de `feat/design-system`)
- Backend de referência: repositório `Grigs2/BackEndJava`, branch `origin/test/exec_swagger_postman` (mais recente; inclui `feature/BackEnd-completo-funcionalidades`)

---

## 0. Pedido

1. Cadastro em etapas (progressive disclosure): Acesso → Dados pessoais → Endereço por CEP → Documentação (CNH, quando aplicável), com máscaras e validações (CPF, CNH, telefone, e-mail, data de nascimento com idade mínima, CEP).
2. Recuperação de senha ponta a ponta (solicitação → código → nova senha).
3. Perfil / Editar conta em seções (Dados pessoais, Contato, Endereço), com campos sensíveis somente leitura e feedback por toast.
4. Decisão do produto (04/11/2026): **usar o backend novo com autenticação JWT**.

---

## 1. Levantamento das branches (04/11/2026)

### Frontend — `Grigs2/frontendreact`

| Branch | Situação |
|---|---|
| `origin/main` | `2bda4ac feat: sistema de notificações` (1 commit à frente da `main` local) |
| `feat/design-system` | Design System (`1192215`); divergia da `main` em 1 commit cada lado |
| `origin/master` | Linha antiga (abr/2026) de Docker, 18 commits fora da `main` — não utilizada |

### Backend — `Grigs2/BackEndJava` (cópia local em `C:\Users\Beatriz\BackEndJava`)

| Branch | Situação |
|---|---|
| `master` local | 12 commits atrás da remota — provavelmente é a versão em execução na porta 8080 (sem CORS) |
| `origin/main` | Sistema de notificações + CORS |
| `origin/feature/BackEnd-completo-funcionalidades` | Backend completo: JWT, perfis, endereços estruturados, documentos, admin |
| `origin/test/exec_swagger_postman` | A anterior + Swagger/Postman (**referência deste trabalho**) |
| `origin/validacao-infos-entrada` | Validações de entrada |

Nenhuma branch do backend foi alterada ou trocada localmente.

---

## 2. Contrato do backend novo usado pelo app

Fonte: `Docs/API_DOCUMENTACAO_COMPLETA_V3.md`, `SecurityConfig.java`, `AutenticacaoController.java` e DTOs da branch de referência.

### Autenticação e sessão (`/Autenticacao`)

| Endpoint | Público | Uso no app |
|---|---|---|
| `POST /Entrar` `{email, senha}` | sim | Login. Retorna `accessToken` (15 min), `refreshToken` (30 dias) e `perfil {id, usuarioId, nome, tipoPerfil}` |
| `POST /Renovar` `{refreshToken}` | sim | Renovação automática em 401; o refresh token é rotativo (o antigo é invalidado) |
| `POST /Sair` `{refreshToken}` + Bearer | não | Logout |
| `POST /AlterarSenha` `{senhaAtual, novaSenha}` + Bearer | não | Troca de senha no Perfil |
| `POST /SolicitarRedefinicaoSenha` `{email}` | sim | Recuperação — tela 1. Sempre `202` com mensagem genérica (anti-enumeração); limite de 1 pedido a cada 60 s e 5 por hora |
| `POST /RedefinirSenha` `{token, novaSenha}` | sim | Recuperação — tela 3 |

- Todas as demais rotas exigem `Authorization: Bearer <accessToken>` (401 sem token, 403 sem permissão).
- `POST /Motorista|Responsavel|Escola/Autenticar` continuam existindo, mas **não emitem token** — o app deixa de usá-los.
- Perfil completo após login: `GET /Motorista/Perfil`, `GET /Responsavel/Perfil`, `GET /Escola/Perfil`.
- Erros: `ErrorResponseDTO {timestamp, status, error, message, path}`.

### Regras que impactam o frontend

| Regra do backend | Consequência no app |
|---|---|
| Senha: mínimo **12** caracteres, máximo 72 bytes, sem exigência de composição | O pedido era "mínimo 8 + maiúscula + número + especial". Para não gerar senhas recusadas, o app exige **12+ caracteres** e mantém maiúscula, número e caractere especial |
| Redefinição usa **token aleatório enviado por link** (SendGrid → `PASSWORD_RESET_URL?token=...`), válido por 15 min e de uso único | Não existe código de 6 dígitos nem endpoint de validação isolado. A tela 2 aceita o token (ou o link colado) e a validação acontece no `RedefinirSenha` |
| Cadastro exige `aceitouTermos: true` | Etapa final do cadastro com aceite dos termos |
| Motorista e Escola exigem `enderecoOperacionalDTO` (CEP, logradouro, número, complemento, bairro, cidade, UF); o backend valida o CEP no ViaCEP | Endereço estruturado enviado + `usuarioDTO.endereco` textual (compatibilidade) |
| Responsável não tem endereço estruturado | Endereço do formulário é enviado montado em `usuario.endereco` |
| Motorista: idade mínima de 18 anos e CPF válido | Validação equivalente no app |
| Escola exige **CNPJ** válido e único | Campo CNPJ adicionado ao cadastro de escola (não existia no app) |
| CNH: 11 dígitos | Máscara/validação de 11 dígitos |
| Rotas já usadas pelo app (viagens, presença, notificações, dependentes…) | Todas continuam existindo com os mesmos caminhos |

---

## 3. Integração da `main` (notificações) — 04/11/2026

- `origin/main` integrada na branch nova (merge ainda não commitado).
- Conflitos resolvidos:
  - `DriverLayout`, `GuardianLayout`, `SchoolLayout`: mantidos como wrappers do `AppLayout`; o item "Notificações" (`NotificationList`) da `main` foi levado para `MENU_ITEMS` em `AppLayout.tsx` (substitui "Avisos" no motorista; adicionado para responsável e escola nas mesmas posições da `main`).
  - `DriverMainScreen`: atalho "Avisos" → "Notificações" (`NotificationList`), no padrão `ShortcutCard`.
  - `SchoolMainScreen`: atalho de Notificações adicionado como `ShortcutCard`.
- `NotificationListScreen` e `NotificationCreateScreen` (novas na `main`) migradas para o Design System, sem alterar lógica.
- `NoticeBoardScreen`: deixou de ser registrada na `main` e não compilava com o novo `NotificacaoDTO` (`data` → `dataCriacao`) — erro já existente na `main`. Ajustado apenas o nome do campo.

---

## 4. Implementação

### 4.1 Autenticação JWT (camada de serviços)

| Arquivo | Papel |
|---|---|
| `src/services/config.ts` (novo) | `BASE_URL` e timeout em um único lugar (antes ficava em `api.ts`) |
| `src/services/authSession.ts` (novo) | Estado da sessão: access token **só em memória**; refresh token persistido no armazenamento seguro (`expo-secure-store` → Keychain/Keystore; no web, `AsyncStorage`). Renovação *single-flight* (chamadas simultâneas compartilham um único `Renovar`, pois o refresh token é rotativo e reapresentá-lo revoga a sessão). Guarda o vencimento do access token para renovação proativa |
| `src/services/api.ts` | Interceptores: (1) anexa `Authorization: Bearer` fora das rotas públicas; (2) renova **antes** de enviar se o token vence em ≤ 30 s; (3) em 401 **de token** (mensagem `Credenciais ausentes, inválidas ou expiradas` do backend) renova uma vez e repete a requisição; 401 de regra de negócio (ex.: senha atual incorreta) não dispara renovação; (4) se a renovação for recusada, dispara "sessão expirada" |
| `src/services/authService.ts` | Reescrito: `entrar` (`/Autenticacao/Entrar` + `GET /{Perfil}/Perfil`), `restaurarSessao`, `sair`, `alterarSenha`, `solicitarRedefinicaoSenha`, `redefinirSenha`, `carregarPerfil`. Removidos `loginMotorista/Responsavel/Escola` (endpoints legados que não emitem token). Perfil `ADMIN` é recusado no app com mensagem |
| `src/components/SessionExpiryHandler.tsx` (novo) | Sessão expirada → limpa usuário, volta ao Login (via `navigationRef`) e mostra aviso |
| `src/navigation/index.ts` | `navigationRef`, `HOME_BY_ROLE`, rotas `ForgotPassword`, `ForgotPasswordCode`, `ResetPassword`, `SchoolProfile`; `Register.role` opcional |
| `src/components/AppLayout.tsx` | "Sair" chama `POST /Autenticacao/Sair` (revoga refresh token) e limpa o usuário; escola ganhou "Meu Cadastro" |
| `src/utils/apiError.ts` (novo) | Mensagem amigável a partir de `ErrorResponseDTO.message` / `mensagem` / `erro`, 429 e falha de rede |
| `src/types.ts` | `AutenticacaoResponseDTO`, `PerfilAutenticadoDTO`, `TipoPerfil`, `EnderecoOperacionalDTO`, `aceitouTermos`, `cnpj`, `cor` do veículo (todos opcionais → telas existentes intactas) |
| `package.json` / `app.json` | `expo-secure-store` (instalado com `npx expo install`, que também registrou o config plugin) |

Fluxo de login:

```
Login → POST /Autenticacao/Entrar → guarda tokens → GET /{Motorista|Responsavel|Escola}/Perfil
      → setCurrentUser(perfil, role) → navigation.reset(home do perfil)
Abrir o app com sessão salva → POST /Autenticacao/Renovar → GET /{Perfil}/Perfil → home
Requisição com token vencido → (proativo) Renovar → envia;  401 de token → Renovar → repete;  Renovar recusado → Login
```

### 4.2 Máscaras e validações — `src/utils/masks.ts` e `src/utils/validators.ts` (novos)

| Campo | Máscara | Validação |
|---|---|---|
| CPF | `000.000.000-00` | Algoritmo oficial dos 2 dígitos verificadores; rejeita sequências repetidas |
| CNPJ (escola) | `00.000.000/0000-00` | Algoritmo oficial dos dígitos verificadores |
| CNH | 11 dígitos | Tamanho exato (regra do backend) e não repetida |
| Telefone | `(00) 00000-0000` ou `(00) 0000-0000` (dinâmica) | DDD na lista oficial da Anatel; celular começa com 9; fixo começa com 2–5 |
| E-mail | — | Regex estrita (sem espaços, sem `..`, TLD com 2+ letras, ≤ 254 caracteres) |
| Data de nascimento | `DD/MM/AAAA` | Data real (rejeita 31/02), não futura, ≥ 1900 e **idade mínima de 18 anos** (motorista e responsável) |
| CEP | `00000-000` | 8 dígitos; consulta ViaCEP com tratamento de CEP inexistente e indisponibilidade |
| Senha | — | ≥ 12 caracteres (backend) + maiúscula + número + caractere especial; ≤ 72 bytes UTF-8; confirmação |

Conversão de datas: `brToIsoDate` / `isoToBrDate` (tela `DD/MM/AAAA` ↔ API `YYYY-MM-DD`).
Verificação: 33 casos automatizados (máscaras, CPF/CNPJ válidos e inválidos, DDD, 31/02, idade, senha) — todos passaram.

### 4.3 Componentes de formulário — `src/components/forms/` (novos)

| Componente | Uso |
|---|---|
| `AddressForm` | CEP em destaque no topo; ao completar 8 dígitos consulta o ViaCEP e preenche logradouro, bairro, cidade e UF, movendo o foco para **Número**. Mensagens de status (buscando / encontrado / não encontrado / indisponível). Campos sempre editáveis para preenchimento manual. Funções `validateAddress`, `formatAddress` (texto legado), `toEnderecoOperacional` / `fromEnderecoOperacional` |
| `PasswordStrength` | Barra de 4 níveis (Fraca → Forte) + checklist dos critérios com ícone e texto |
| `StepIndicator` | "Etapa N de M · título" + barra segmentada |
| `RadioCardGroup` | Escolha única em cartões (tipo de conta) |
| `Checkbox` | Aceite dos termos |
| `src/services/cepService.ts` | Consulta ViaCEP com timeout de 8 s e erros tipados (`invalido`, `nao_encontrado`, `indisponivel`) |

### 4.4 Cadastro em etapas — `RegisterScreen`

Progressive disclosure: cada perfil vê só as etapas que se aplicam.

| Perfil | Etapa 1 | Etapa 2 | Etapa 3 | Etapa 4 |
|---|---|---|---|---|
| Responsável | Acesso (tipo de conta, e-mail, senha + força, confirmação) | Nome, CPF, nascimento (18+), celular | Endereço por CEP + termos | — |
| Motorista | Acesso | Nome, CPF, nascimento (18+), celular | Endereço por CEP | CNH (11 dígitos) + termos |
| Escola | Acesso | Nome, **CNPJ**, administrador, telefone | Endereço por CEP + termos | — |

- Validação por etapa ao tocar em "Continuar"; erros exibidos no próprio campo e limpos ao editar.
- Envio: Motorista/Escola enviam `enderecoOperacionalDTO` + `usuarioDTO.endereco` (texto); Responsável envia o endereço montado em `usuario.endereco`. Todos com `aceitouTermos: true`, data ISO, CPF/CNPJ/telefone mascarados.
- Erro do backend: toast com a mensagem e retorno automático à etapa do campo recusado (e-mail, CPF/CNPJ, CEP/endereço, CNH).
- Sucesso: entra automaticamente com as credenciais recém-criadas; se não for possível, volta ao Login com aviso.

### 4.5 Recuperação de senha

| Tela | Conteúdo |
|---|---|
| `ForgotPasswordScreen` (1/3) | E-mail (pré-preenchido a partir do Login) → `SolicitarRedefinicaoSenha`; exibe a mensagem genérica do backend (não revela se a conta existe). Atalho "Já tenho um código" |
| `ForgotPasswordCodeScreen` (2/3) | Campo do código: aceita o token puro **ou o link inteiro** colado (extrai `token=`). Botão de reenvio com contador de 60 s (mesmo intervalo mínimo do backend) |
| `ResetPasswordScreen` (3/3) | Nova senha + força + confirmação → `RedefinirSenha {token, novaSenha}`. Token inválido/expirado/usado → estado dedicado com "Solicitar novo código". Sucesso → Login |
| Link do e-mail (web) | O Login detecta `?token=` na URL, remove o token do endereço (não fica no histórico) e abre a tela 3 diretamente. Para isso, configure no backend `PASSWORD_RESET_URL` com a URL do frontend web (ex.: `http://localhost:8081/`) |

### 4.6 Perfil / Editar conta — `ProfileScreen` (motorista, responsável e escola)

- Ao abrir, recarrega os dados do servidor (`GET /{Perfil}/Perfil`).
- Cabeçalho com avatar, nome e selo do perfil.
- Seções em cards, cada uma com "Editar" (uma por vez; as demais ficam bloqueadas durante a edição):
  - **Dados pessoais / da instituição:** nome editável (e administrador, na escola). **CPF, data de nascimento e CNPJ somente leitura** (ícone de cadeado + aviso).
  - **Contato:** e-mail (com aviso de que muda o login) e telefone com máscara/validação de DDD.
  - **Endereço:** `AddressForm` com CEP. Motorista/escola mostram o selo "CEP validado" / "Validação pendente" (`statusValidacao`) e aviso quando falta endereço estruturado (necessário para iniciar viagens). Se o endereço não for editado, o estruturado salvo é preservado (campo omitido no envio).
  - **Segurança:** troca de senha (`/Autenticacao/AlterarSenha`) com força/confirmação; como o backend revoga todas as sessões, o app encerra a sessão e volta ao Login.
- Toda alteração cadastral é confirmada com a senha atual (`PasswordConfirmationModal`), exigência do `AlterarInfos`. Senha incorreta → "Senha incorreta. Nenhuma alteração foi salva." (sem renovação de sessão desnecessária).
- Toasts de sucesso/erro em todas as ações.

### 4.7 Ajustes de UX/acessibilidade feitos durante os testes

- Tipo de conta passou de `SegmentedControl` para `RadioCardGroup` ("Responsável" não cabia em 390 px).
- Link "Esqueci minha senha" ganhou `accessibilityLabel`.
- Aviso de sessão expirada é exibido por último (a tela que falhou também mostra um toast de erro).
- Interceptor deixou de renovar a sessão em 401 de regra de negócio (senha errada causava `Renovar` + repetição).

---

## 5. Validação realizada (04/11/2026)

- `npx tsc --noEmit`: sem erros.
- Testes dos validadores: 33/33.
- Expo web em 390×844. Como o backend novo não está rodando localmente (a porta 8080 serve a versão antiga), o contrato JWT foi **simulado dentro da aba do navegador**, reproduzindo rotas, códigos e mensagens do backend novo. O ViaCEP foi consultado de verdade.

| Cenário | Resultado |
|---|---|
| Cadastro de motorista (4 etapas): validações de e-mail, senha fraca, confirmação, CPF com DV errado, 31/02, DDD inválido, CEP inexistente, termos | Mensagens corretas no campo; bloqueio da etapa |
| ViaCEP 01001-000 / 01310-100 | Logradouro, bairro, cidade e UF preenchidos; foco no número |
| Payload de `/Motorista/Cadastrar` | Igual ao contrato (enderecoOperacionalDTO, aceitouTermos, data ISO, máscaras); sem `Authorization` |
| Login com senha errada / certa | "E-mail ou senha inválidos." / `Entrar` → `GET /Responsavel/Perfil` com Bearer → home |
| Access token invalidado no servidor | `401 → Renovar → repete com o novo token`, transparente |
| Senha errada ao salvar perfil | Um único 401, toast, nada salvo |
| Edição de endereço por CEP (responsável) | Texto montado em `usuario.endereco`; sem endereço estruturado (o backend não tem para esse perfil) |
| Troca de senha | `AlterarSenha 204 → Sair 204` → refresh token apagado → Login |
| Recuperação: link com token inválido | Estado "código inválido ou expirado" com ação de novo pedido |
| Recuperação: abrir `/?token=...` (web) | Abre "Nova senha" direto, remove o token da URL, `RedefinirSenha 204` → Login |
| Sessão revogada (access e refresh) | `Renovar 401` → Login + "Sua sessão expirou" |

**Não validado:** backend novo real (requer subir a branch de referência com PostgreSQL e variáveis de ambiente), envio real de e-mail (SendGrid) e execução em aparelho/emulador (SecureStore nativo).

---

## 6. Funcionalidades preservadas

- Telas de viagens, chamada, monitoramento, dependentes, convites e notificações não foram alteradas; passam a enviar o token automaticamente pelo interceptor.
- Todas as rotas usadas por essas telas existem no backend novo com os mesmos caminhos.
- `PasswordConfirmationModal`, `AlterarInfos` e o modelo de dados existente foram mantidos.

---

## 7. Como testar com o backend novo

1. No repositório `BackEndJava`, usar a branch `test/exec_swagger_postman` (ou a que for integrada à `main`) e seguir `Docs/Configuracao_do_sistema_para_execucao.md` (PostgreSQL, `JWT_SECRET_BASE64`, etc.).
2. Para a recuperação por e-mail: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` e `PASSWORD_RESET_URL` (URL do frontend, ex.: `http://localhost:8081/`).
3. O CORS do backend novo já libera `http://localhost:8081` (Expo web).
4. No celular físico, trocar `BASE_URL` em `src/services/config.ts` pelo IP da máquina.

---

## 8. Pendências e observações

1. **Backend novo ainda não está na `main` do BackEndJava** e não está em execução localmente; o frontend desta branch depende dele (os endpoints antigos de `Autenticar` não emitem token).
2. **Código de 6 dígitos:** o backend gera um token aleatório enviado por link. Se o produto quiser um código numérico de 6 dígitos digitável, o backend precisa gerar esse formato (e, idealmente, um endpoint de validação do código antes da nova senha).
3. **Política de senha divergente do pedido:** backend exige 12+ caracteres sem composição; o app exige 12+ **e** maiúscula/número/especial. Alinhar com o backend se a composição também deve ser obrigatória no servidor.
4. **Link de redefinição no app nativo:** só o web abre a tela automaticamente. Para o app nativo é preciso configurar um *deep link* (scheme no `app.json` + `linking` no `NavigationContainer`); hoje o usuário cola o código/link.
5. **Troca de e-mail** não tem verificação do novo endereço no backend ("Confirmação de contato ainda não é oferecida"); o app exige a senha atual.
6. **Termos de Uso / Política de Privacidade:** o aceite é registrado, mas não há texto/URL dos termos para exibir.
7. **Documentos do motorista:** o backend trata CNH, vistoria e licenciamento como metadados em `/Motorista/{id}/Documentos` (sem upload de arquivo). O cadastro envia apenas o número da CNH (campo legado); a submissão de documentos ainda não tem tela.
8. **Web:** sem armazenamento seguro, o refresh token fica no `AsyncStorage` (localStorage). Aceitável para desenvolvimento; em produção web, avaliar cookie `HttpOnly`.
9. `GuardianDependentFormScreen` continua com data `YYYY-MM-DD` e endereço livre; pode reaproveitar `AddressForm`/máscaras e os endpoints de endereços estruturados do dependente.
10. O merge da `main` (notificações) está aplicado na branch, **sem commit**.
