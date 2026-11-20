# Checklist de ajustes do motorista (19/11/2026)

Branch `feat/ajustes-checklist-motorista` nos dois repositórios, criada a partir do redesenho do Lucas (`homologacao` com o PR #3). A branch `feat/redesenho-responsavel` (Otavio) não foi usada, porque ainda está em teste.

## Status de cada item

| # | Item | Status | Onde |
|---|------|--------|------|
| 1 | Simplificar a navegação; modais para veículo e dependentes | Avaliado, não alterado | Hoje são telas próprias com formulário longo (endereço, CEP, escola). Em modal ficariam apertadas no celular. Sugestão: manter as telas e decidir com o grupo. |
| 2 | Rever a tela da lista de alunos | Feito | `DriverStudentsScreen` |
| 3 | Tirar o endereço direto das paradas (fica no pop-up de detalhes) | Feito | Atendimento, Detalhes da viagem, Início |
| 4 | Retirar a barra superior fixa | Já estava feito (Lucas) | `AppLayout` só tem o sino flutuante |
| 5 | Retirar o texto ao lado da logo | Já estava feito (Lucas) | `LoginScreen` usa `showText={false}` |
| 6 | Validação da CNH com envio de foto | Não feito | Precisa de `expo-image-picker` no app e de um campo de arquivo e armazenamento no backend. Hoje `DocumentoMotorista` só guarda número, categoria e datas. |
| 7 | Dois acessos na mesma conta (nome e telefone de cada um) | Parcial (já existia) | O convite de corresponsável (`GuardianDependentGuardiansScreen`) dá a cada pessoa o seu próprio login, nome e telefone. |
| 8 | Responsável não aceitar duas viagens no mesmo período e data | Feito na branch do Otavio | Commit `20de373` em `feat/redesenho-responsavel`. Entra quando ela for mesclada. |
| 9 | Pesquisar Google Maps para rotas e previsão de chegada | Feito | Estudo e projeto no Google Cloud prontos. Falta ligar ao app (build EAS) e ao backend. |
| 10 | Mostrar o horário estimado de chegada de cada aluno | Depende do item 9 | Os endereços ainda não têm latitude e longitude. É preciso geocodificar e usar a Routes API. |
| 11 | Alternativa: notificação "Você será o próximo aluno" | Feito | Backend: `PROXIMO_ALUNO` |
| 12 | Mapa alternativo em linhas e estações (como metrô), também offline | Feito | `RotaEstacoes` |
| 13 | Paradas com mais de um aluno: "Embarque de Lucas, Ana" | Feito | `utils/paradas.ts` → `rotuloParada` |
| 14 | Ordem alfabética nos desembarques do atendimento | Feito | `DriverAttendanceScreen` |
| 15 | Corrigir "interromper viagem" | Feito | App e backend |
| — | Mais visibilidade para notificações novas | Feito | Sino, Início e aviso na tela |
| — | Vínculo escola + motorista passa a ser opcional | Feito | Backend |
| — | Tela de alunos mostra só os já vinculados ao motorista | Feito | `DriverStudentsScreen` |

## O que mudou no app

### Atendimento (`DriverAttendanceScreen`)
- **Interromper viagem:** novo botão abaixo de "Faltam N alunos". Ele pede o motivo (`ReasonDialog`) e envia `INTERROMPIDA`. Antes só existiam cancelar (viagem não iniciada) e finalizar.
- **Sem endereço no cartão.** O cartão mostra "Embarque de Ana e Julia" ou "Desembarque na EMEF Pedro II", com o botão **Ver detalhes**. O pop-up (`ParadaDetalhesModal`) mostra:
  - o endereço completo;
  - os alunos da parada, com o status e o responsável de cada um;
  - um atalho de mensagem para cada responsável.
- **Ordem alfabética:** quando há vários alunos na mesma parada (por exemplo, a escola na ida), o atendimento vai do primeiro ao último nome.
- **Quadro de direções falso substituído.** O quadro escuro mostrava "Em 120 m, vire à direita" fixo no código. Agora ele mostra dados reais:
  - "Faltam N paradas" (ou "Última parada");
  - "Depois: Embarque de Enzo".
- **Linha de estações (item 12):** o novo botão "Ver linha" troca o mapa pela rota desenhada como linha de metrô.
  - Cada parada é uma estação, numerada.
  - Estações concluídas ficam verdes; a atual fica amarela.
  - Tocar numa estação pendente leva o atendimento até ela. Tocar numa já concluída abre os detalhes.
  - Sem internet a linha aparece sozinha no lugar do mapa, porque o mapa não carrega offline.

### Detalhes da viagem (`DriverTripDetailsScreen`)
- O roteiro mostra "Embarque de …" com a quantidade de alunos, sem endereço.
- O ícone (i) de cada parada abre o mesmo pop-up de detalhes.

### Início do motorista
- O cartão da rota em andamento mostra "Próxima: Embarque de Ana e Julia" no lugar da rua.
- O atalho **Alunos** abre os alunos vinculados. Antes abria a busca de alunos novos.

### Alunos vinculados (`DriverStudentsScreen`)
- Antes a tela consultava sempre a viagem de id 1, que estava fixa no código.
- Agora ela junta os alunos de **todas** as viagens ativas do motorista, sem repetir, em ordem alfabética.
- Cada aluno mostra a escola, as viagens de que participa e o responsável. O telefone do responsável pode ser tocado para ligar.
- Tem busca por nome ou escola (aparece com mais de 5 alunos) e o botão "Buscar e convidar alunos".

### Notificações novas mais visíveis (todos os perfis)
- **Sino:** fica amarelo com borda quando há não lidas, e o selo vermelho ficou maior.
- **Início:** novo cartão "Novidades: N notificações novas", com o botão "Ver notificações". Aparece para motorista, responsável e escola.
- **Aviso na tela:** quando o contador sobe (a checagem é a cada minuto ou ao trocar de tela), aparece "Você tem 1 notificação nova. Toque no sino para ver."

## Arquivos

- Novos: `src/components/ParadaDetalhesModal.tsx`, `src/components/RotaEstacoes.tsx`.
- Alterados:
  - `src/utils/paradas.ts`
  - `src/screens/DriverAttendanceScreen.tsx`
  - `src/screens/DriverTripDetailsScreen.tsx`
  - `src/screens/DriverMainScreen.tsx`
  - `src/screens/DriverStudentsScreen.tsx`
  - `src/screens/GuardianMainScreen.tsx`
  - `src/screens/SchoolMainScreen.tsx`
  - `src/components/AppLayout.tsx`
  - `src/components/HomeBlocks.tsx`
  - `src/context/AppContext.tsx`

## Como foi testado

- `npx tsc --noEmit -p .` sem erros.
- Navegador (Expo web) com a API simulada, na conta do motorista:
  - Início com o cartão "Novidades" e o sino em destaque.
  - Atendimento com "Embarque de Ana e Julia" (duas alunas na mesma casa), pop-up de detalhes e linha de estações.
  - Embarque registrado, com a próxima aluna em ordem alfabética.
  - Interromper com motivo, enviando `{ novoStatus: "INTERROMPIDA", motivo }`.
  - Aviso de notificação nova e lista de alunos vinculados.
- Não testado num aparelho Android real.
