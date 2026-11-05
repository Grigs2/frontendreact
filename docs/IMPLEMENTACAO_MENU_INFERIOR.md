# Implementação do Menu Inferior e Ajustes de Layout

Este documento descreve as alterações feitas no frontend (`frontendreact`) para:

1. Corrigir o layout das telas iniciais no Android (celular).
2. Adicionar uma barra de navegação inferior nos três perfis (Motorista, Responsável e Escola).
3. Manter o menu lateral funcionando.

## 1. Ajustes de layout no Android

### Causa

As telas iniciais usavam `alignItems: 'center'` no wrapper e colocavam `maxWidth` e `alignSelf` no `contentContainerStyle` do `ScrollView`, e não no próprio `ScrollView`. No Android, o `ScrollView` sem largura definida era encolhido até o tamanho do conteúdo. Como os `ShortcutCard` usam largura em porcentagem, os cards vazavam pela direita. No navegador, a largura do viewport mascarava o problema.

### Correção

Em cada tela, o `ScrollView` passou a ocupar 100% da largura, com `maxWidth: 800` e `alignSelf: 'center'`. O conteúdo interno ocupa 100% do `ScrollView`.

Arquivos alterados:

- `src/screens/GuardianMainScreen.tsx`: estilo `scroll` novo; `webWrapper` sem `alignItems`; `gridContainer` sem `maxWidth`; `grid` com `width: '100%'`.
- `src/screens/DriverMainScreen.tsx`: mesmo ajuste (estilo `scroll`, `webWrapper` e `container`).
- `src/screens/SchoolMainScreen.tsx`: `maxWidth` e `alignSelf` movidos do `container` para o estilo `scroll`.

## 2. Menu inferior (barra de abas)

### Novo componente

`src/components/BottomTabBar.tsx`

- Recebe `items` (lista de abas), `activeKey` (rota atual) e `onPress`.
- Destaca a aba ativa com fundo amarelo claro (`colors.primaryTint`) e texto em negrito.
- Usa `useSafeAreaInsets` (de `react-native-safe-area-context`) para não ficar sob a barra de navegação do sistema.
- Rótulos limitados a uma linha (`numberOfLines={1}`).

### Integração no layout

`src/components/AppLayout.tsx`

- Nova constante exportada `BOTTOM_TABS`, com uma lista por perfil (`driver`, `guardian`, `school`).
- A barra é renderizada abaixo do conteúdo. O menu lateral (`MENU_ITEMS`) não foi alterado e continua listando todas as telas, incluindo Histórico, Planos e Sair.
- `handleTabPress` navega para a aba selecionada, exceto quando ela já é a tela atual.

### Abas por perfil

| Perfil | Ordem das abas |
|---|---|
| Motorista | Início, Roteiro, Chamada, Veículo, Perfil |
| Responsável | Início, Convite, Rastreio, Alunos, Perfil |
| Escola | Início, Notificações, Perfil |

Rotas correspondentes:

| Aba | Rota |
|---|---|
| Início (motorista) | `DriverMain` |
| Roteiro | `DriverTrips` |
| Chamada | `DriverAttendance` |
| Veículo | `DriverVehicle` |
| Perfil (motorista) | `DriverProfile` |
| Início (responsável) | `GuardianMain` |
| Convite | `GuardianInvites` |
| Rastreio | `GuardianTracking` |
| Alunos | `GuardianDependents` |
| Perfil (responsável) | `GuardianProfile` |
| Início (escola) | `SchoolMain` |
| Notificações | `NotificationList` |
| Perfil (escola) | `SchoolProfile` |

### Observações

- Na aba **Chamada**, a tela usa a viagem ativa do contexto. Sem viagem ativa, ela exibe um aviso e redireciona para **Roteiro**, comportamento que já existia pelo menu lateral.
- Em telas que não são abas (ex.: detalhes de viagem), nenhuma aba fica destacada.
- Os rótulos da aba do responsável são versões curtas dos nomes do menu lateral: **Monitoramento** virou **Rastreio** e **Dependentes** virou **Alunos**. Somente a barra inferior usa os nomes curtos.

## 3. Validação

- `npx tsc --noEmit`: sem erros.
- `npx expo export --platform android`: bundle gerado sem erros (a pasta temporária de saída foi removida).
- Validação visual no celular pendente: recarregar o app com `npx expo start -c`.
