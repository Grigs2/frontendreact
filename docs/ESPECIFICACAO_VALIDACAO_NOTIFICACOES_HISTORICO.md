# Especificação: validação do cadastro, termos, notificações e histórico

**Projeto:** Tio da Perua · **Versão:** 1.0 (rascunho para aprovação) · **Data:** 06/11/2026

> **Atualização (06/11/2026, implementação):** a maior parte desta especificação foi implementada. O que mudou em relação ao rascunho está marcado com **[ajuste]** ao longo do texto, e o detalhe do que foi feito está em `docs/IMPLEMENTACAO_VALIDACAO_NOTIFICACOES_HISTORICO.md` (app) e `Docs/IMPLEMENTACAO_NOTIFICACOES_HISTORICO_TERMOS.md` (API). Ficaram para depois: "motorista próximo" (GPS), NFC, preferências de notificação por tipo e troca de motorista.

Este documento detalha regras, UI/UX, arquitetura e fluxo de dados de quatro frentes. Para cada item, a seção **Situação atual** diz o que já existe no código (frontend `feat/inicio-busca-cadastros` e backend `feat/busca-solicitacao-viagem-escola`, ambos ainda não enviados) e o que falta. Nada aqui foi implementado além do que está marcado como existente.

---

## 0. Resumo: o que existe e o que falta

| Item | Situação | O que falta |
|---|---|---|
| Validação inline no cadastro (CPF, CNPJ, e-mail, telefone, senha, data, CEP) | **Existe** | Padronizar o momento da validação (ao sair do campo) e o foco no primeiro erro |
| Bloqueio do avanço com erro | **Existe** (botão valida e não avança) | Rolagem/foco até o campo com erro |
| Aceite dos Termos com checkbox obrigatório | **Existe** (modal + checkbox; backend grava data e versão) | Download em PDF, link permanente fora do cadastro, novo aceite quando a versão mudar |
| Notificação in-app de embarque, desembarque e falta | **Existe** (mensagem genérica, sem nome nem horário) | Mensagem com nome e horário, tipo e vínculo com a viagem |
| Notificação de início, fim, cancelamento e interrupção da viagem | **Existe** (in-app) | Motivo na mensagem e tipo |
| Push (celular bloqueado/app fechado) | **Não existe** | Registro do aparelho, envio pelo Expo Push, preferências |
| "Motorista próximo / a caminho" | **Não existe** | Depende de o app do motorista enviar GPS (a API já recebe e guarda) e de uma regra de aproximação |
| Embarque por badge/NFC | **Não existe** | Proposto como fase futura; hoje a marcação é manual |
| Responsável avisar que o aluno vai faltar | **Não existe** | Novo endpoint e tela |
| Atraso e troca de veículo/motorista | **Parcial**: só cancelar/interromper com motivo | Aviso de atraso e de troca |
| Histórico de viagens do motorista | **Existe** (lista de dias) | Detalhe por dia com horários de cada aluno |
| Histórico de viagens do responsável | **Não existe** (a tela atual é um aviso "em implementação") | Endpoint e tela |
| Central de notificações | **Parcial**: lista e "marcar como lida", mas a notificação lida **some** da lista | Abas Não lidas/Todas, agrupamento por data, "marcar todas", filtros |

---

## 1. Validação de formulários e UX do cadastro

### 1.1 Regras por campo

| Campo | Máscara | Regra | Mensagem de erro |
|---|---|---|---|
| E-mail | — | Formato `nome@dominio.tld`, sem espaços, até 254 caracteres; único no sistema (API) | "E-mail inválido. Ex.: nome@dominio.com" · "Este e-mail já tem cadastro." |
| Senha | — | 12+ caracteres, maiúscula, número e caractere especial; até 72 bytes | Lista de regras com ✓/✗ abaixo do campo + "A senha não atende às regras." |
| Confirmar senha | — | Igual à senha | "As senhas não conferem." |
| CPF | `000.000.000-00` | 11 dígitos, dígitos verificadores, rejeita repetidos (111.111.111-11); único (API) | "CPF incompleto." · "CPF inválido. Confira os números." · "CPF já cadastrado." |
| CNPJ (escola) | `00.000.000/0000-00` | 14 dígitos e dígitos verificadores; único (API) | "CNPJ inválido. Confira os números." |
| Telefone | `(00) 00000-0000` ou `(00) 0000-0000` | DDD válido; celular começa com 9 | "DDD inválido." · "Celular deve começar com 9 após o DDD." |
| Data de nascimento | `DD/MM/AAAA` | Data real (rejeita 31/02), não futura; 18+ para motorista/responsável; 1 a 25 anos para aluno | "Data inválida." · "É preciso ter 18 anos ou mais." |
| CNH | 11 dígitos | 11 dígitos, não repetidos | "A CNH deve ter 11 dígitos." |
| CEP | `00000-000` | 8 dígitos; consulta ViaCEP; se falhar, campos ficam editáveis | "CEP não encontrado. Preencha o endereço." |
| Termos | — | Checkbox marcado | "É preciso aceitar os termos para criar a conta." |

**Fonte da verdade:** a API revalida tudo. O app valida antes só para dar retorno rápido. Erros da API (CPF/e-mail duplicado) voltam para a etapa e o campo correspondentes (já implementado em `stepForBackendMessage`).

### 1.2 Comportamento da interface

1. **Quando validar:**
   - ao **sair do campo**;
   - ao tocar em **Continuar**;
   - durante a digitação, **só depois** de o campo já ter mostrado erro, para o erro sumir assim que for corrigido (não acusar enquanto a pessoa ainda digita).
2. **Campo com erro:**
   - borda 2 px na cor `danger`;
   - ícone de alerta;
   - mensagem abaixo do campo em texto (a cor nunca é o único sinal);
   - `accessibilityLabel` inclui a mensagem, para o leitor de tela ler o erro.
3. **Avanço bloqueado:**
   - **Continuar** permanece habilitado, para não esconder o motivo;
   - ao tocar com erro, não avança, rola até o primeiro campo com erro, dá foco nele e mostra um aviso curto: "Confira os campos destacados.";
   - assim a pessoa sabe exatamente onde agir.
4. **Indicador de etapas:** a etapa com erro fica marcada; etapas já válidas mostram ✓.
5. **Mensagens:** dizem o problema e a correção ("CPF inválido. Confira os números."), sem jargão nem código de erro.

### 1.3 Aceite dos Termos de Uso e Política de Privacidade

**Situação atual:** existem o modal com o texto completo (`TermsModal`), o botão "Li e aceito", o checkbox obrigatório e o registro no backend (`usuario.termos_aceitos_em` e `termos_versao`).

**Especificação:**

1. **Na última etapa do cadastro:**
   - botão **"Ler os termos completos"**, que abre o modal;
   - checkbox **"Li e aceito os Termos de Uso e a Política de Privacidade"**;
   - link **"Baixar PDF"**;
   - o checkbox pode ser marcado sem abrir o modal, mas o texto do link fica sempre visível.
2. **Download:** o PDF é gerado a partir do mesmo texto (`src/content/termosPrivacidade.ts`) e publicado em uma URL fixa e pública, por exemplo `GET /Termos/{versao}.pdf` na API ou um arquivo estático. No app, `Linking.openURL(url)`.
3. **Acesso permanente:** link "Termos e Privacidade" no login e em Perfil › Mais opções.
4. **Versionamento:**
   - `TERMS_VERSION` no app e `TERMS_VERSION` no backend devem ser iguais;
   - quando a versão mudar, o login retorna `termosPendentes: true` (o backend compara `usuario.termos_versao` com a versão vigente) e o app mostra o modal com **"Li e aceito"** obrigatório antes de continuar;
   - o aceite chama `POST /Autenticacao/AceitarTermos {versao}`.
5. **Prova do aceite (LGPD):** além de data e versão, guardar o identificador da sessão (já existe no refresh token). Não guardar IP sem necessidade.

| Novo no backend | Descrição |
|---|---|
| `GET /Termos/vigente` | `{ versao, atualizadoEm, urlPdf }` (público) |
| `POST /Autenticacao/AceitarTermos` | Registra novo aceite da versão vigente |
| Campo `termosPendentes` na resposta do login | `true` quando a versão aceita é anterior |

---

## 2. Sistema de notificações para responsáveis

### 2.1 Arquitetura

```
 Evento de negócio (ViagemService / SolicitacaoService / LocalizacaoViagemService)
        │  publica NotificacaoEvento { tipo, viagemDiaId, dependenteId, dados }
        ▼
 NotificacaoService
   1. resolve destinatários (responsáveis vinculados ao aluno)
   2. aplica preferências e deduplicação
   3. grava na tabela notificacao (in-app)  ──────────────► GET /Notificacao/... (app)
   4. grava pendências na tabela notificacao_envio (push)
        ▼  (depois do commit da transação, assíncrono)
 PushSender  ── POST https://exp.host/--/api/v2/push/send ──► Expo Push ─► FCM/APNs ─► celular
   5. registra resultado (enviado / falhou / token inválido → desativa o aparelho)
```

**Decisões de arquitetura:**

- **In-app primeiro, push depois.** A notificação é gravada na mesma transação do evento: se a chamada for registrada, o aviso existe. O push é enviado **depois do commit** (`@TransactionalEventListener(AFTER_COMMIT)` + `@Async`). Se o serviço de push cair, nada se perde, porque a central do app continua tendo o aviso.
- **Expo Push Service**, porque o app é Expo. Ele dispensa integrar FCM e APNs separadamente. É necessário um *development build* (EAS): o Expo Go não recebe push remoto no Android, e o push não funciona na versão web.
- **Tempo real no app aberto:** ao receber um push com o app em primeiro plano, o app atualiza a central e a tela atual. Sem push (web), consulta a cada 30 s enquanto estiver aberto. WebSocket não é necessário nesta fase.
- **Deduplicação:** chave `(tipo, viagemDiaId, dependenteId, destinatario)` é única por evento. Eventos repetidos, inclusive os vindos de sincronização offline, não geram dois avisos (a API já evita presença duplicada).
- **Privacidade:** o texto do push na tela bloqueada usa o **primeiro nome** do aluno, sem endereço. O detalhe completo fica dentro do app.

### 2.2 Modelo de dados

Alterações na tabela `notificacao`:

| Campo novo | Tipo | Descrição |
|---|---|---|
| `tipo` | VARCHAR(40) **[ajuste]** gravado como texto, sem CHECK no banco, para novos tipos não exigirem migração | `MOTORISTA_A_CAMINHO`, `MOTORISTA_PROXIMO`, `EMBARQUE`, `DESEMBARQUE`, `AUSENCIA`, `AUSENCIA_INFORMADA`, `VIAGEM_INICIADA`, `VIAGEM_FINALIZADA`, `VIAGEM_CANCELADA`, `ATRASO`, `TROCA_VEICULO`, `TROCA_MOTORISTA`, `SOLICITACAO`, `MANUAL` |
| `prioridade` | VARCHAR(10) | `ALTA` (falta, cancelamento, troca), `NORMAL` |
| `viagem_dia_id` | FK, nulo | Liga o aviso à viagem do dia (abre o detalhe ao tocar) |
| `dependente_id` | FK, nulo | Aluno do aviso |
| `lida_em` | TIMESTAMP, nulo | Data da leitura (`visto` continua por compatibilidade) |
| `chave_dedup` | VARCHAR(120), único | Evita duplicidade |

Tabelas novas:

| Tabela | Campos | Uso |
|---|---|---|
| `dispositivo_push` | id, usuario_id, expo_token (único), plataforma, ativo, criado_em, ultimo_uso_em | Aparelhos que recebem push. Ao sair da conta, o token é desativado |
| `notificacao_envio` | id, notificacao_id, dispositivo_id, status (`PENDENTE`, `ENVIADO`, `FALHOU`), tentativas, erro, enviado_em | Rastreia o push e permite reenvio |
| `preferencia_notificacao` | usuario_id, tipo, push_ativo | O responsável desliga o push de tipos não críticos. In-app é sempre gravado |

Endpoints novos:

| Endpoint | Uso |
|---|---|
| `POST /Notificacao/Dispositivos` `{expoToken, plataforma}` | App registra o aparelho após o login e a permissão |
| `POST /Notificacao/Dispositivos/Remover` `{expoToken}` | Ao sair da conta. **[ajuste]** POST com corpo em vez de DELETE com o token na URL (o token não fica em log de acesso) |
| `GET/PUT /Notificacao/Preferencias` | Preferências por tipo |

### 2.3 Eventos

| Evento | Gatilho | Destinatários | Título · mensagem (exemplo) | Canal | Prioridade |
|---|---|---|---|---|---|
| **Motorista a caminho** | Viagem do dia passa para `EM_ANDAMENTO` | Responsáveis de todos os alunos da viagem | "A caminho" · "Carlos saiu para a viagem da manhã. Ana Clara é a 3ª parada." | Push + in-app | Normal |
| **Motorista próximo** | Posição do veículo a ≤ 500 m (configurável) da parada do aluno, ou 2 paradas antes; **uma vez por aluno por viagem** | Responsáveis do aluno da parada | "Motorista chegando" · "O motorista está a cerca de 3 min da parada de Ana Clara." | Push + in-app | Alta |
| **Aluno embarcado** | Presença `ESPERANDO → EMBARCADO` (manual ou badge/NFC) | Responsáveis do aluno | "Embarque confirmado" · "Ana Clara embarcou às 06:52 com Carlos (ABC-1D23)." | Push + in-app | Normal |
| **Aluno desembarcado** | Presença `EMBARCADO → DESEMBARCADO` | Responsáveis do aluno | "Desembarque confirmado" · "Ana Clara foi entregue na EMEF Pedro II às 07:18." (ou "em casa") | Push + in-app | Normal |
| **Falta registrada** | Presença `ESPERANDO → FALTOU` pelo motorista | Responsáveis do aluno | "Ausência registrada" · "Ana Clara não embarcou na viagem da manhã. Se for engano, fale com o motorista." | Push + in-app | Alta |
| **Ausência informada** | Responsável avisa que o aluno não vai | **Motorista** (e os outros responsáveis do aluno) | "Ausência avisada" · "Ana Clara não vai à aula amanhã (manhã)." | Push + in-app | Normal |
| **Atraso** | Motorista informa atraso (botão "Avisar atraso": 10, 20 ou 30 min + motivo opcional) | Responsáveis dos alunos ainda não entregues | "Viagem atrasada" · "A viagem da manhã está cerca de 20 min atrasada: trânsito." | Push + in-app | Alta |
| **Cancelamento / interrupção** | Viagem do dia `CANCELADA` / `INTERROMPIDA` (motivo já é obrigatório) | Responsáveis de todos os alunos | "Viagem cancelada" · "A viagem de hoje foi cancelada: pneu furado. Providencie outro transporte." | Push + in-app | Alta |
| **Troca de veículo** | Motorista altera o veículo com viagem ativa no dia | Responsáveis dos alunos das viagens do dia | "Veículo diferente hoje" · "Hoje a viagem será feita no Renault Master prata (XYZ-5678)." | Push + in-app | Alta |
| **Troca de motorista** | Viagem do dia assumida por substituto (fase futura) | Responsáveis | "Motorista substituto" · "Hoje quem leva Ana Clara é João Pereira." | Push + in-app | Alta |

### 2.4 Regras dos novos eventos

**Motorista próximo:**

1. **Origem da posição:** o app do motorista envia a posição a cada 15 s durante a viagem (`PUT /Viagem/Localizacao`, que já existe na API, com consentimento obrigatório do motorista).
2. **Cálculo da distância:** o backend usa a distância em linha reta (Haversine) até a próxima parada com aluno `ESPERANDO`. A parada precisa de coordenadas: ao salvar o endereço do aluno, a API geocodifica o CEP e o número uma única vez e guarda latitude e longitude no `endereco_dependente`.
3. **Regra de disparo:** a notificação sai quando a distância fica abaixo de 500 m, ou quando o aluno vira a próxima parada depois de 2 embarques. Com isso funciona mesmo sem geocodificação precisa.
4. **Privacidade:** só envia se o responsável consentiu com o compartilhamento de localização daquele aluno (a API já guarda esse consentimento). Sem consentimento, o aviso é só "o motorista está a caminho", sem distância.

**Embarque por badge/NFC (fase futura):**
- o aluno recebe um cartão NFC com um identificador aleatório, ligado ao aluno;
- o app do motorista lê o cartão (`react-native-nfc-manager`, só Android/iOS) e chama a mesma `AlterarStatusPresenca`;
- o histórico registra a origem (`origem: NFC | MANUAL`);
- regras: cartão de aluno que não está na viagem é recusado com aviso; leitura repetida é ignorada.

**Ausência informada pelo responsável:**
1. **Endpoint:** `POST /Responsavel/Dependente/{id}/Ausencias {data, periodos[], motivo?}`. Prazo: até o início da viagem daquele período.
2. **Efeito na viagem:** ao gerar a viagem do dia, o aluno já entra como `FALTOU` (origem `RESPONSAVEL`) e não gera parada.
3. **Viagem já gerada:** se a viagem do dia já existir, o status passa direto para `FALTOU`.
4. **Cancelamento:** `DELETE` remove a ausência antes do início da viagem.
5. **Tela:** no card do aluno no Início, botão **"Avisar falta"**, que abre a escolha de data e período e um motivo opcional.

**Atraso e trocas:**
- **Atraso:** `POST /Viagem/ViagemDia/{id}/Atraso {minutos, motivo?}`. No máximo um aviso a cada 10 min por viagem; o mais recente substitui o anterior na central.
- **Troca de veículo:** disparada em `PUT /Motorista/{id}/Veiculo` quando há viagem do dia `PLANEJADA` ou `EM_ANDAMENTO`.

### 2.5 UI/UX no app

1. **Permissão de push:** pedir depois do primeiro login do responsável, em uma tela que explica o porquê ("Para avisar quando seu filho embarcar e desembarcar"). Se a pessoa negar, há um lembrete discreto na central, e nada é bloqueado.
2. **Toque no push:** abre o destino do aviso:
   - embarque, desembarque, próximo e atraso → Monitoramento do aluno;
   - ausência e solicitações → Vínculos;
   - os demais → Central.
3. **App aberto:** um aviso no topo (toast) e o sino com contador de não lidas.
4. **Prioridade alta:** som e vibração padrão. As de prioridade normal podem ser silenciadas nas preferências.
5. **Preferências:** Perfil › Notificações, com um interruptor por tipo. Falta, cancelamento e trocas são críticos: o push vem ligado e o desligamento pede confirmação.

---

## 3. Histórico de viagens e central de notificações

### 3.1 Histórico de viagens

**Responsável** (tela nova, substitui o aviso "em implementação"):

1. **Filtros:**
   - aluno (chips, quando há mais de um);
   - período: últimos 7 dias, 30 dias ou datas personalizadas.
2. **Lista:** agrupada por dia (ex.: "Seg, 19 out"), com um card por viagem do dia. O card mostra:
   - selo de status: Concluída, Faltou, Cancelada ou Em andamento;
   - nome e período da viagem ("Viagem para EMEF Pedro II · Manhã · ida");
   - horário de embarque → desembarque ("06:52 → 07:18");
   - motorista e placa.
3. **Detalhe:**
   - linha do tempo do aluno naquela viagem: saída do motorista, embarque (hora, quem registrou), desembarque (hora, local);
   - motivo, quando for cancelamento ou falta;
   - as notificações enviadas naquele dia.
4. **Vazio:** "Nenhuma viagem neste período."

**Motorista** (a lista de dias já existe; acrescentar o detalhe):
1. **Lista:** agrupada por dia, com o card "Viagem para X · Manhã · ida · 06:40 → 07:35 · 6 paradas · 12 alunos".
2. **Detalhe:**
   - cada parada na ordem, com cada aluno, status e horários;
   - total de embarcados, faltas e desembarques;
   - motivo, quando a viagem foi cancelada ou interrompida.

**Endpoints:**

| Endpoint | Retorno |
|---|---|
| `GET /Responsavel/Dependente/{id}/Historico?de=&ate=&pagina=` | Lista paginada de `HistoricoAlunoDTO { viagemDiaId, data, viagemNome, periodo, motoristaNome, placa, statusPresenca, horarioEmbarque, horarioDesembarque, localDesembarque, statusViagem, motivo }` |
| `GET /Viagem/Historico/{idMotorista}?de=&ate=&pagina=` | Já existe; acrescentar paginação, nome da viagem, horários de início e fim e contagens |
| `GET /Viagem/ViagemDia/{id}/Resumo` | Paradas, alunos, horários e histórico de status (junta dados que já existem: `HistoricoPresenca` e `HistoricoStatusViagemDia`) |

**Regras:**
- **Acesso:** o responsável só vê alunos vinculados a ele (regra de acesso existente, RN01); o motorista só vê as próprias viagens.
- **Fonte dos horários:** `viagem_presenca.horario_embarque` e `horario_desembarque`, que já são gravados.
- **Retenção:** histórico de presença por 1 ano. **[ajuste]** O histórico do motorista consulta por padrão o último ano; o do responsável, os últimos 30 dias (a tela oferece 30 dias, 3 meses e 1 ano; o máximo por consulta é 366 dias). A localização continua sendo apagada em 7 dias, então não aparece no histórico.

### 3.2 Central de notificações

**Situação atual:**
- a lista mostra as notificações não lidas, e "Marcar como lida" **remove o item da lista**, então o responsável perde o histórico;
- não há agrupamento nem filtro.

**Especificação:**

1. **Abas:**
   - **Não lidas (n)**;
   - **Todas**, com as lidas incluídas e mais apagadas.
2. **Organização:** agrupada por data (Hoje, Ontem, depois "19 out"). Cada item mostra:
   - ícone do tipo;
   - título em negrito se não lido;
   - mensagem em até 2 linhas;
   - hora;
   - ponto de "não lida".
3. **Filtros (chips):** Viagem (embarque, desembarque, próximo, a caminho), Alertas (falta, atraso, cancelamento, troca), Solicitações e Avisos manuais.
4. **Ações:**
   - tocar no item marca como lido e abre o destino (mesmas regras do push);
   - **"Marcar todas como lidas"** no topo;
   - deslizar para marcar como lida (só celular).
5. **Paginação:** 30 por página, com carregamento ao rolar. Puxar para baixo atualiza.
6. **Sino do cabeçalho:** contador de não lidas (até "9+").

| Endpoint | Uso |
|---|---|
| `GET /Notificacao/Listar/{idUsuario}?status=NAO_LIDAS\|TODAS&tipo=&pagina=` | Hoje devolve tudo sem página; acrescentar filtros e paginação |
| `GET /Notificacao/NaoLidas/Contagem` | Contador do sino |
| `PUT /Notificacao/VisualizarNotificacao/{id}` | Já existe; gravar também `lida_em` |
| `PUT /Notificacao/MarcarTodasLidas` | Novo |

**Retenção:** ~~1 ano~~ **[ajuste]** mantida em **90 dias**, como já estava no código e no teste da equipe (`NotificacaoServiceTest`). Mudar para 1 ano é uma decisão do grupo (altera o teste e a política de privacidade).

---

## 4. Fluxo de dados de ponta a ponta (exemplo: embarque)

```
App do motorista                API                                  App do responsável
──────────────────────────────────────────────────────────────────────────────────────────
Toque "Embarcou" ──PUT /Viagem/AlterarStatusPresenca──►
                                valida motorista, transição e viagem em andamento
                                grava presença + histórico + notificação (1 transação)
              ◄──── 200 paradas atualizadas ────
                                AFTER_COMMIT → PushSender (assíncrono)
                                         └──► Expo Push ──► "Embarque confirmado" ──► celular
                                                                     toque ──► Monitoramento
                                                                     app aberto ──► GET /Notificacao/... (atualiza central)
```

Sem internet no motorista: o app guarda o evento com UUID e envia por `POST /Viagem/SincronizarPresencasOffline` (já existe na API). A notificação sai quando o evento chega, com o **horário do aparelho** na mensagem, e a chave de deduplicação impede aviso repetido.

---

## 5. Requisitos não funcionais

| Requisito | Meta |
|---|---|
| Latência do push | Até 10 s entre o registro e a entrega ao serviço de push (a entrega final depende do sistema do celular) |
| Confiabilidade | In-app gravado em 100% dos eventos; push com até 3 tentativas e espera crescente entre elas; token inválido é desativado |
| Privacidade (LGPD) | Push sem endereço e só com o primeiro nome; aproximação só com consentimento; retenção de 90 dias para notificações e de 1 ano para o histórico e de 7 dias para localização |
| Acessibilidade | Erros lidos pelo leitor de tela; cor nunca é o único sinal; alvos de toque ≥ 48 dp |
| Segurança | Endpoints de histórico e notificações respeitam o vínculo (RN01); token de push nunca é exibido |

---

## 6. Plano de implementação sugerido

| Fase | Entrega | Depende de |
|---|---|---|
| 1 | Central de notificações com abas, agrupamento, "marcar todas" e contador; mensagens com nome, horário e tipo; histórico do responsável e detalhe do motorista | Só backend e app atuais |
| 2 | Validação ao sair do campo com foco no primeiro erro; PDF e link permanente dos termos; novo aceite por versão | — |
| 3 | Push: registro do aparelho, envio pelo Expo, preferências e permissão | *Development build* (EAS) e credenciais FCM/APNs |
| 4 | Ausência informada pelo responsável; aviso de atraso; troca de veículo | Fase 1 |
| 5 | GPS no app do motorista, "motorista a caminho" e "motorista próximo" | Fase 3 + geocodificação dos endereços |
| 6 | Badge/NFC e troca de motorista | Cartões NFC; regra de motorista substituto |

**Testes por fase:**
- **Unitários (Mockito):** destinatários, deduplicação, regras de disparo e prazos.
- **Integração:** autorização dos endpoints novos.
- **App:** fluxo no navegador e em aparelho real para push e GPS.

---

## 7. Decisões pendentes (da equipe/orientador)

1. **Distância de "motorista próximo":** usar 500 m e "2 paradas antes", ou outro critério?
2. **Prazo da ausência:** pode ser avisada até o início da viagem, ou até um horário fixo (ex.: 30 min antes)?
3. **Desligar push crítico:** permitir desligar falta, cancelamento e troca?
4. **Geocodificação:** serviço gratuito com limite (Nominatim/OpenStreetMap) ou pago (Google)? Isso afeta custo e precisão.
5. **NFC:** entra no escopo do TCC ou fica como trabalho futuro?
6. **Push na versão web:** fora do escopo? (Proposta: sim, só celular.)
