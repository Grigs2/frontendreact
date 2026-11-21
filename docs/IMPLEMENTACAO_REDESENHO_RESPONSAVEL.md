# Redesenho do fluxo do Responsável

**Branch:** `feat/redesenho-responsavel` (front e back) · **Data:** 18/11/2026
**Situação:** implementado. `npx tsc --noEmit` sem erros e `npx expo export --platform web` sem erros. Sem commit e sem push.
**Design:** `Docs/TioDaPerua_DesignPattern.figcraft`, seção **07 · Responsável · novos elementos** (criada pelo EasyRunCraft/FigCraft).
**Padrão visual:** `Docs/guia_1111_otavio_padrao_visual_front.md` (seções 4.7 e 6.1 atualizadas).
**API correspondente:** `BackEnd/BackEndJava/Docs/IMPLEMENTACAO_REDESENHO_RESPONSAVEL_BACK.md`.

## Decisões tomadas com o dono do produto (18/11/2026)

| Tema | Decisão |
|---|---|
| CPF do motorista vinculado | Alterar o backend: CPF completo só com vínculo ativo (solicitação aceita e sem `dataFim`). O telefone já vinha completo. |
| Duas viagens no mesmo período | Validar no backend (409 ao aceitar) **e** bloquear no app antes de aceitar. |
| Horário estimado | Sem provedor de rota (D8). Estimativa = último evento conhecido + (paradas antes + 1) × 5 min, nunca antes de agora + paradas antes × 5 min. Sempre rotulada como estimativa. Constante `MINUTOS_POR_PARADA` em `src/utils/progressoViagem.ts`. |
| Mapa do Responsável | Criar a tela cheia no "Acompanhar". Toque no mapa amplia um nível; toque numa área sem botão fora do mapa reduz um nível. |

## Checklist (executado em sequência)

| # | Item | Situação |
|---|---|---|
| 0 | Artes no FigCraft (seção 07) | ✅ |
| 1 | Popout de não lidas no sino, com "Marcar todas como lidas" | ✅ |
| 2 | CPF e telefone sem censura para motorista com vínculo ativo | ✅ |
| 3 | Detalhe do aluno: títulos dentro dos cards; "Últimas viagens" com slot de relógio | ✅ |
| 4 | "Avisar falta" no Histórico com escolha do aluno | ✅ |
| 5 | Mapa: toque amplia / toque fora reduz (motorista e responsável) | ✅ |
| 6 | Início: luz de status + hora no canto do card | ✅ |
| 7 | Início: estimativa do próximo passo lógico da viagem | ✅ |
| 8 | Início: remover atalhos repetidos da barra (inclui Notificações) | ✅ |
| 9 | Início: logo sobre trilho de paradas no lugar da saudação | ✅ |
| 10 | Notificações: remover recorte dos botões de filtro | ✅ |
| 11 | Card inicial e "Acompanhar": paradas antes da próxima interação, horário estimado e destaque | ✅ |
| 12 | Mapa alternativo em linha de metrô quando a localização não está disponível | ✅ |
| 13 | Validação: não aceitar duas viagens do mesmo período (back + front) | ✅ |
| 14 | Nome das paradas com mais de um aluno ("Embarque de Lucas, Ana") | ✅ |

## O que mudou para o usuário

| # | Antes | Agora |
|---|---|---|
| 1 | O sino abria a tela de Notificações | O sino abre um popout com as **não lidas**, no mesmo card da central, botão "Marcar todas como lidas" e "Ver todas as notificações". Tocar numa notificação marca como lida e abre o destino; tocar fora fecha. Vale para todos os perfis com sino. |
| 2 | CPF do motorista censurado mesmo depois do vínculo | Com vínculo ativo, "Dados do motorista" mostra telefone e CPF completos. Na tela do aluno, tocar no motorista em "Motoristas" abre esse pop-up. |
| 3 | Títulos em negrito soltos acima dos cards (Endereços, Responsáveis, Motoristas, Localização do transporte, Últimas viagens) | O título fica dentro do card, ao lado de um slot amarelo com ícone (mapa, pessoas, perua, pino, relógio). "Últimas viagens" usa o relógio. |
| 4 | "Avisar falta" no Histórico só para o aluno selecionado na lista | Com mais de um aluno, o diálogo começa com "Qual aluno?". |
| 5 | Mapa só mudava de tamanho pelos botões | Motorista: tocar no mapa pequeno abre a tela cheia; tocar em área sem botão reduz (tela cheia → pequeno → oculto). Responsável: mapa do "Acompanhar" ganhou tela cheia, com a mesma regra (o mínimo é o mapa pequeno). Os botões continuam funcionando. |
| 6–7, 11 | Card do aluno com ícone de perfil e "Hoje: …" | No canto, a **luz de status** (bolinha + texto + hora da última alteração). Com viagem em andamento, a faixa "Próxima interação" diz o que acontece com o aluno (motorista vai buscar, chega à escola, embarque na volta, chegada em casa), quantas paradas faltam e o horário estimado. Quando é a próxima parada, o card fica com borda amarela e a faixa vira "PRÓXIMO EVENTO DA VIAGEM". Atualiza a cada 30 s com o Início aberto. |
| 8 | Atalhos Alunos, Motoristas, Vínculos, Avisos e Perfil | Só "Histórico" (o único que não está na barra; notificações ficam no sino). |
| 9 | "Olá, Nome. Acompanhe o transporte dos seus alunos." | Arte do logo (pino com a perua) passando por uma parada de um trilho, como num mapa de metrô. |
| 10 | Filtros em faixa horizontal, cortados na borda | Filtros quebram linha; nenhum fica cortado. |
| 11 | "Acompanhar" sem previsão | Mesma faixa de próxima interação no card de status (e no card flutuante da tela cheia), com destaque quando é a próxima parada. |
| 12 | Sem localização: texto "Aguardando a posição do veículo" | O topo mostra a linha de metrô: paradas feitas, o veículo entre a última feita e a próxima, a parada do aluno em destaque e as futuras. Paradas de outros alunos aparecem como "Parada N" (sem nomes). Tocar amplia, como no mapa. |
| 13 | Era possível aceitar duas viagens do mesmo período | O convite mostra "Período já ocupado" e desabilita o aceite. O backend também responde 409. |
| 14 | "Embarque de Lucas Silva" mesmo com dois alunos no ponto | "Embarque de Lucas, Ana" em todas as telas do motorista que mostram o nome da parada. |

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/NotificationCard.tsx` (novo) | Card de notificação extraído da central (mesmo visual na central e no popout). Pressionado escurece o fundo, sem opacidade. |
| `src/components/NotificationPopout.tsx` (novo) | Popout do sino. |
| `src/components/AppLayout.tsx` | O sino abre o popout. |
| `src/screens/NotificationListScreen.tsx` | Usa `NotificationCard`; filtros em linhas que quebram. |
| `src/components/CounterpartModal.tsx`, `src/types.ts` | `cpf` e `vinculoAtivo` no `ContraparteDTO`; CPF completo quando vem da API; aviso de privacidade ajustado. |
| `src/components/HomeBlocks.tsx` | `CardHeader` (slot 48 + título dentro do card). |
| `src/screens/GuardianDependentDetailScreen.tsx` | Títulos dentro dos cards; relógio em "Últimas viagens"; motorista abre o pop-up de dados. |
| `src/components/AbsenceModal.tsx`, `src/screens/HistoryScreen.tsx` | Prop `dependentes` para escolher o aluno. |
| `src/hooks/useNivelMapa.ts` (novo) | `useNivelMapa` (oculto/pequeno/tela cheia) e `useAreaToque` (toque reduz, deslize troca de aluno). |
| `src/components/TripMap.tsx`, `TripMap.web.tsx` | Prop `onPress` (no web, camada transparente sobre o iframe). |
| `src/screens/DriverAttendanceScreen.tsx` | Usa os níveis do mapa; toque no mapa amplia, toque fora reduz. |
| `src/screens/GuardianMonitoringScreen.tsx` | Tela cheia, paradas, próxima interação com destaque e linha de metrô sem localização. |
| `src/utils/progressoViagem.ts` (novo) | Estado das paradas, próxima interação, estimativa e luz de status. |
| `src/services/acompanhamentoService.ts` (novo) | Monitoramento + execução + paradas de um aluno. |
| `src/components/TripProgress.tsx` (novo) | `StatusLight` e `ProximaInteracaoBox`. |
| `src/components/HomeHeaderArt.tsx` (novo) | Arte do logo sobre o trilho (SVG). |
| `src/components/MetroProgressMap.tsx` (novo) | Mapa alternativo em linha de metrô (SVG). |
| `src/screens/GuardianMainScreen.tsx` | Reescrita: arte no topo, card do aluno com luz e próxima interação, só o atalho Histórico. |
| `src/screens/GuardianInvitesScreen.tsx` | Bloqueio de aceite por período ocupado. |
| `src/utils/paradas.ts` | `nomeParada()`. Usado em `DriverAttendance`, `DriverFocus`, `DriverRouteOrder`, `DriverRouteView`, `DriverTripDay` e `DriverTripDetails`. |

## Limites e pontos de atenção

- **Estimativa:** é aproximada e não usa trânsito nem distância. Antes do início da viagem não há horário ("após o início da viagem"). Paradas de outros alunos não têm horários próprios no DTO, então o "último evento" usa a última mudança da execução e do aluno.
- **Paradas para o responsável:** o app usa `GET /Viagem/BuscarParadasViagemDia/{id}`, já liberado para os responsáveis da execução. Esse endpoint devolve nomes e endereços dos outros alunos; o app **não exibe** esses dados (só contagem e "Parada N"). Restringir o payload para o responsável seria uma mudança de backend futura.
- **Popout:** aparece em todos os perfis com sino (motorista, responsável, escola), pois o sino é do `AppLayout` comum.
- **Mapa em tela cheia do Responsável:** o sino continua visível sobre o mapa.
- `DriverMapScreen` (placeholder sem link) não foi alterada.
- `assets/design/TioDaPerua_DesignPattern.figcraft` já diferia da cópia em `Docs/` antes desta entrega e não foi substituído; a versão com a seção 07 está em `Docs/`.

## Como foi verificado

- `npx tsc --noEmit`: sem erros.
- `npx expo export --platform web`: bundle gerado sem erros.
- Backend: `./mvnw.cmd test` com 172 testes, 0 falhas.
- **Não verificado:** visual no celular e no navegador, e o fluxo contra a API real (backend não estava rodando). Roteiro sugerido:
  1. Responsável com dois alunos; motorista inicia a viagem de ida; conferir a luz, "Faltam N paradas" e o horário estimado no Início e no "Acompanhar"; registrar embarques até o aluno ser o próximo e conferir o destaque.
  2. Sem consentimento de GPS: conferir a linha de metrô no "Acompanhar"; tocar para tela cheia e tocar no card flutuante para reduzir.
  3. Motorista: tocar no mapa (pequeno → tela cheia); tocar no card flutuante (→ pequeno); tocar numa área vazia (→ oculto).
  4. Sino: abrir o popout, tocar numa notificação, "Marcar todas como lidas".
  5. Aceitar uma segunda viagem de manhã-ida para o mesmo aluno: aceite desabilitado; pela API, 409.
  6. Dois alunos no mesmo endereço: conferir "Embarque de Lucas, Ana".

## Ajustes após o teste no Codespace (20/11/2026)

| Tela | Antes | Agora |
|---|---|---|
| Acompanhar | Título "Acompanhar" com o nome do aluno | Só a seta de voltar e, com mais de um aluno, a escolha do aluno na mesma linha. Sem mapa no topo, a linha deixa espaço para o sino. |
| Alunos | "+ Novo" ficava embaixo do sino flutuante | "+ Novo" fica à esquerda do sino (`layout.bellReserve`). |
| Início | Marca "Tio da Perua" em duas linhas e arte de 96 px, desalinhadas dos títulos das outras abas | "Tio da Perua" no mesmo estilo e posição do título das outras abas (`typography.title`, topo da tela) e arte compacta (28 px) no lugar do subtítulo, com pino e perua menores. O espaço até o primeiro card é o mesmo do `ScreenHeader` (24 px). |

Arquivos: `src/theme/index.ts` (`layout.bellReserve` = 56), `src/screens/GuardianMonitoringScreen.tsx`, `src/screens/GuardianDependentsScreen.tsx`, `src/components/HomeHeaderArt.tsx`.

**Pendente:** registrar a arte compacta do cabeçalho no FigCraft (seção 07). A tentativa falhou por falta de créditos no EasyRunCraft; o `.figcraft` em `Docs/` continua com a versão anterior da arte.

## Merge com a `homologacao` (20/11/2026)

A `homologacao` recebeu, em paralelo, a rota do Google com previsão de chegada, a vista em linha do motorista e o `rotuloParada`. Decisões tomadas no merge:

| Ponto | Decisão |
|---|---|
| Card "notificações novas" no Início | Retirado. As notificações ficam só no popout do sino, como no redesenho. |
| Previsão de chegada (Início e Acompanhar) | Rota do Google, com trânsito, quando existir (`comPrevisaoDaRota` em `utils/progressoViagem.ts`). Sem GPS ou sem rota, a estimativa de 5 min por parada é a reserva. A faixa de próxima interação diz qual das duas está valendo. |
| Atendimento do motorista | Mantidos "Ver linha", o modo offline e os botões da `homologacao`. Somado o toque: no mapa amplia; fora dele, onde não há botão, reduz (tela cheia → pequeno → oculto). |
| Nome das paradas | Vale o `rotuloParada` da `homologacao` ("Embarque de Ana e Lucas"). O `nomeParada` foi removido. Telas sem o período da viagem usam `idaDasParadas()` para saber se é ida ou volta. |
| Acompanhar (Responsável) | Estrutura do redesenho (mapa pequeno/tela cheia, linha de metrô sem localização) com a rota, a parada do aluno, o enquadramento e a autorização de localização na tela, que vieram da `homologacao`. |

Verificado depois do merge: `npx tsc --noEmit` sem erros e `npx expo export --platform web` sem erros. Não verificado em aparelho.
