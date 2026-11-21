# IMPLEMENTACAO_HORARIO_PARTIDA_VIAGEM.md

> Contrato compartilhado entre front (React Native) e back (Java). Este documento é a fonte de verdade para a funcionalidade de horário de partida. Campos e endpoints marcados como **proposta** ainda não existem e precisam ser validados pelo back.

# Objetivo

Permitir que o motorista configure o horário de partida de uma viagem:

1. Na criação da viagem, define um **horário padrão de partida**.
2. Em cada dia específico da viagem, pode **alterar o horário de partida**. Se não alterar, vale o padrão definido na criação.
3. Viagens já criadas recebem um padrão inicial por turno: **MANHA = 07:00**, **TARDE = 12:00**, **NOITE = 17:00**.

# Conceitos

| Conceito | Descrição |
|---|---|
| Viagem (`Viagem`) | Rota com um período (`MANHA_IDA`, `TARDE_VOLTA`, etc.). Uma viagem tem um horário padrão de partida. |
| Execução do dia (`ViagemDia`) | Ocorrência de uma viagem em uma data. Pode ter um horário de partida próprio. |
| Horário padrão | Valor em `Viagem`. Usado quando a execução do dia não tem horário próprio. |
| Horário do dia | Valor em `ViagemDia`. Só existe quando o motorista alterou o horário naquela data. |

**Regra de resolução (back e front devem usar a mesma):**

```
horarioPartidaEfetivo = ViagemDia.horarioPartida ?? Viagem.horarioPartidaPadrao
```

Se a execução do dia não tiver horário próprio, o padrão da viagem é usado. Alterar o padrão da viagem **não** altera execuções do dia que já têm horário próprio.

**Padrões por turno (usados na criação e no backfill):**

| Período | Turno | Horário padrão |
|---|---|---|
| `MANHA_IDA`, `MANHA_VOLTA` | manhã | 07:00 |
| `TARDE_IDA`, `TARDE_VOLTA` | tarde | 12:00 |
| `NOITE_IDA`, `NOITE_VOLTA` | noite | 17:00 |

Ida e volta têm horários independentes. Cada viagem tem um único período, então cada uma guarda seu próprio horário.

# Regras de Negócio

1. **Criação:** o motorista informa o horário de partida ao criar a viagem. Se não informar, o back usa o padrão do turno da tabela acima.
2. **Formato:** horário no formato `HH:mm` (24h), sem data e sem fuso (horário local da escola).
3. **Alteração do padrão:** o motorista pode alterar o horário padrão da viagem. Isso afeta apenas datas futuras sem horário próprio.
4. **Alteração por dia:** o motorista pode definir o horário de partida de uma data específica, dentro da janela de preparação (hoje + 6 dias, igual à `agenda`).
5. **Voltar ao padrão:** enviar horário vazio (`null`) no dia remove o horário próprio e volta a usar o padrão da viagem.
6. **Viagens já existentes (backfill):** viagens ativas criadas antes desta mudança recebem o padrão do turno. Execuções de dia já criadas também passam a usar o padrão da viagem, sem gravar horário próprio.
7. **Execução em andamento:** alterar o horário enquanto a viagem do dia está `EM_ANDAMENTO` ou `FINALIZADA` não é permitido.

# Contrato de API (proposta)

Endpoints ficam em `src/services/api.ts` (objeto `API_ENDPOINTS`) e as chamadas em `src/services/viagemService.ts`.

## 1. Criar viagem com horário (estende o existente)

`POST /Viagem/CriarViagem/{idMotorista}`

Request (novo campo `horarioPartida`, opcional):

```json
{
  "periodo": "MANHA_IDA",
  "escolas": [{ "id": 1, "nome": "" }],
  "nome": null,
  "horarioPartida": "07:00"
}
```

## 2. Alterar horário padrão da viagem

`PUT /Viagem/AlterarHorarioPartida/{idViagem}` (**proposta**)

```json
{ "horarioPartida": "06:45" }
```

Resposta: `ViagemDTO` atualizado.

## 3. Alterar horário de um dia específico

`PUT /Viagem/AlterarHorarioPartidaDia/{idViagem}` (**proposta**)

```json
{ "data": "2026-05-12", "horarioPartida": "07:30" }
```

`horarioPartida: null` remove o horário do dia e volta ao padrão.

Resposta: `ViagemDiaDTO` com `horarioPartida` efetivo preenchido.

Pode ser chamado antes da execução existir. Nesse caso o back cria a execução com `prepararViagemDia` e depois grava o horário.

## 4. Campos novos em DTOs (proposta)

| DTO | Campo | Tipo | Observação |
|---|---|---|---|
| `ViagemDTO` | `horarioPartida` | `string \| null` (`HH:mm`) | Padrão da viagem. Sempre preenchido após o backfill. |
| `ViagemDiaDTO` | `horarioPartida` | `string \| null` (`HH:mm`) | Efetivo (já resolvido: próprio ou padrão). |
| `ViagemDiaDTO` | `horarioPartidaPersonalizado` | `boolean` | `true` se o dia tem horário próprio. Usado para mostrar o aviso "alterado". |
| `AgendaViagemDTO` | `horarioPartida` | `string \| null` | Efetivo, para a agenda e a Home. |
| `ViagemDiaResumoDTO` | `horarioPartida` | `string \| null` | Efetivo, para o histórico. |

O front já possui `horarioInicio`/`horarioFim` em `ViagemDiaDTO` (início e fim reais da execução). **Não reutilizar** esses campos: `horarioPartida` é o horário programado, e `horarioInicio` é quando o motorista de fato iniciou.

## 5. Notificação (proposta)

Ao iniciar a viagem do dia, a notificação aos responsáveis pode informar o horário de partida efetivo. Definir com o back o texto e se isso entra na mesma notificação de atraso (`avisarAtraso`) ou em uma nova.

# Impacto no Front

## Criação e edição (motorista)

- [src/screens/DriverTripsScreen.tsx](/workspaces/frontendreact/src/screens/DriverTripsScreen.tsx): modal de criação (`handleCreateTrip`, linha ~139) ganha o campo "Horário de partida" com padrão do turno. Também precisa de uma forma de alterar o padrão depois (ação na lista de viagens ou na tela de detalhes).
- [src/services/viagemService.ts](/workspaces/frontendreact/src/services/viagemService.ts): `criar` (linha ~49) recebe `horarioPartida`. Novos métodos para alterar padrão e por dia.
- [src/types.ts](/workspaces/frontendreact/src/types.ts): `ViagemDTO` (~linha 228), `ViagemDiaDTO` (~linha 316), `AgendaViagemDTO`, `ViagemDiaResumoDTO` (~linha 135).
- [src/services/api.ts](/workspaces/frontendreact/src/services/api.ts): novos endpoints (`criarViagem` na linha ~125 e os dois novos).

## Preparação e execução do dia (motorista)

- [src/screens/DriverTripDetailsScreen.tsx](/workspaces/frontendreact/src/screens/DriverTripDetailsScreen.tsx): chama `prepararViagemDia` (linhas ~82, 134, 156). Local natural para mostrar o horário do dia e permitir a alteração por data.
- [src/screens/DriverTripDayScreen.tsx](/workspaces/frontendreact/src/screens/DriverTripDayScreen.tsx): chama `prepararViagemDia` (linha ~121) e mostra cabeçalho com período (linha ~227). Mostrar horário efetivo aqui.
- [src/screens/DriverRouteViewScreen.tsx](/workspaces/frontendreact/src/screens/DriverRouteViewScreen.tsx): chama `iniciarViagemDia` (linha ~53). Verificar se o horário precisa aparecer na rota.
- [src/screens/DriverMainScreen.tsx](/workspaces/frontendreact/src/screens/DriverMainScreen.tsx): card "próxima viagem" (linha ~121) mostra dia e período. Incluir o horário de partida.
- [src/screens/DriverTripsScreen.tsx](/workspaces/frontendreact/src/screens/DriverTripsScreen.tsx): agenda (linhas ~204–222) mostra período e data. Incluir horário.
- [src/screens/DriverAttendanceScreen.tsx](/workspaces/frontendreact/src/screens/DriverAttendanceScreen.tsx) e [src/utils/periodo.ts](/workspaces/frontendreact/src/utils/periodo.ts): título da rota. Verificar se o horário entra no título.

## Histórico (motorista e responsável)

- [src/screens/DriverHistoryScreen.tsx](/workspaces/frontendreact/src/screens/DriverHistoryScreen.tsx): mostra período (linhas ~97, 119). Incluir horário programado junto de `inicio`/`fim` reais.
- [src/screens/HistoryScreen.tsx](/workspaces/frontendreact/src/screens/HistoryScreen.tsx): mostra embarque e desembarque reais (linhas ~75–76). Incluir horário de partida programado.

## Visão do responsável

- [src/screens/GuardianMainScreen.tsx](/workspaces/frontendreact/src/screens/GuardianMainScreen.tsx): card do dia (linhas ~101–103). Mostrar "Partida prevista às HH:mm".
- [src/screens/GuardianMonitoringScreen.tsx](/workspaces/frontendreact/src/screens/GuardianMonitoringScreen.tsx): linhas ~246–248 e ~321–326. Mostrar partida prevista ao lado de embarque/desembarque.
- [src/screens/GuardianDependentDetailScreen.tsx](/workspaces/frontendreact/src/screens/GuardianDependentDetailScreen.tsx): histórico (linhas ~283–286).
- [src/components/CounterpartModal.tsx](/workspaces/frontendreact/src/components/CounterpartModal.tsx): dados da viagem (linha ~120).
- [src/screens/GuardianSearchDriverScreen.tsx](/workspaces/frontendreact/src/screens/GuardianSearchDriverScreen.tsx) e [src/screens/GuardianInvitesScreen.tsx](/workspaces/frontendreact/src/screens/GuardianInvitesScreen.tsx): lista de viagens disponíveis e convites. Avaliar se o horário ajuda a escolher a viagem.

## Notificações

- [src/utils/notificationRouting.ts](/workspaces/frontendreact/src/utils/notificationRouting.ts) e `NotificacaoDTO` em [src/types.ts](/workspaces/frontendreact/src/types.ts): só se a notificação de partida for criada (item 5 do contrato).

## Sem impacto esperado

- Estrutura de paradas (`ParadaViagemDTO`), ordem de paradas e presença: o horário de partida não muda a ordem nem os status.
- `DependenteDTO.periodo`: continua como período. O horário é da viagem, não do aluno.

# Impacto no Back (a validar)

- Entidade `Viagem`: novo campo `horarioPartidaPadrao` (`LocalTime`).
- Entidade `ViagemDia`: novo campo `horarioPartida` (`LocalTime`, nullable).
- Migração: adicionar colunas e preencher `Viagem.horarioPartidaPadrao` por turno para viagens existentes (7h / 12h / 17h).
- Regra de resolução do horário efetivo (seção "Conceitos") nos DTOs de agenda, dia, resumo e histórico.
- Validação: `HH:mm` válido; não alterar execução `EM_ANDAMENTO` ou `FINALIZADA`; data dentro da janela de preparação.
- Notificação de partida (se aprovada).
- Endpoints de alteração (seção "Contrato de API").

# Perguntas em aberto

1. O back já tem algum campo de horário de partida ou de saída em `Viagem` ou `ViagemDia`? (Não foi possível verificar: o repositório do back não está neste Codespace.)
2. Alterar o horário padrão deve valer só para datas futuras, ou também para execuções já preparadas e ainda `PLANEJADA`? (Proposta atual: só as que não têm horário próprio.)
3. Execuções de dia já criadas antes da mudança recebem o horário na migração, ou só passam a usar o padrão ao resolver? (Proposta atual: resolver na leitura, sem gravar.)
4. O horário de partida aparece para o responsável como "previsto" ou como compromisso fixo? Isso muda o texto da UI.
5. A alteração por dia deve exigir motivo (como cancelar e interromper) ou é livre?
6. O horário de partida deve entrar na notificação de início de viagem?

# Deploy

Mudanças só em `src/` (sem módulo nativo, sem `app.json`/`app.config.js`) podem ser publicadas por EAS Update. Mudanças em `EXPO_PUBLIC_API_URL` ou em módulos nativos exigem novo APK. Confirmar na implementação.
