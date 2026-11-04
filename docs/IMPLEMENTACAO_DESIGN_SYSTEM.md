# Implementação do Design System — Tio da Perua

Aplicação do Design System definido em `assets/design/TioDaPerua_DesignPattern.figcraft` ao frontend (Expo ~55 · React Native 0.83 · React Navigation 7 · TypeScript), **sem alterar regras de negócio, serviços, rotas ou integrações**.

- Data: 03/11/2026
- Escopo: camada visual (estilos, componentes de UI, acessibilidade). Nenhuma alteração em `src/services`, `src/context`, `src/navigation`, `src/types.ts`, `index.ts`, `app.json` ou `package.json`.

---

## 1. Fonte do design

O `.figcraft` é um arquivo ZIP com `document.json` (árvore de nós) e `thumbnail.png`. Ele não define estilos/variáveis nativos; os tokens foram extraídos dos nós e do bloco "05 · Tokens e diretrizes para implementação (theme.ts)" contido no próprio arquivo. Seções do design:

1. Paleta de cores (neutros, ação, semânticas)
2. Tipografia (Inter 400/700, escala de 7 níveis)
3. Botões (primary, secondary, tertiary, destructive × padrão/pressionado/desabilitado; tamanhos lg/md/ícone)
4. Cards & grids (mock de tela 390×844, biblioteca de cards, regras de card)
5. Tokens e diretrizes para os agentes de IA

## 2. Tokens — `src/theme/index.ts`

Fonte única de estilo. As telas não usam mais nenhum valor de cor hardcoded (verificado: 0 ocorrências de hex em `src/**/*.tsx`).

| Grupo | Conteúdo |
|---|---|
| `colors` | Neutros (`ink #14181F`, `slate700`, `slate500`, `border #C9CFD8`, `surface`, `background #F4F5F7`), ação (`primary #FFC400`, `primaryPressed`, `primaryTint`), semânticas (`success`, `danger`, `info` + tints e `dangerPressed`), estados (`pressedNeutral`, `disabled*`) e derivados (`onPrimary`, `onDanger`, `overlay`) |
| `fonts` / `typography` | `Inter_400Regular` / `Inter_700Bold`; `display 32/40`, `title 24/32`, `heading 20/28`, `bodyLg 18/26`, `body 16/24`, `label 16/20`, `caption 14/20`, `captionBold` |
| `maxFontSizeMultiplier` | `1.3` (escala de fonte do sistema) |
| `spacing` | `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32` |
| `radius` | `card/button/input 16`, `pill 999`, `md 12`, `sm 8` |
| `borders` | `hairline 1`, `alert 2` |
| `layout` | margem de tela 16, gap de grid 16, botões 56/48, slot de ícone 48, chip 32, toque mínimo 48, etc. |
| `elevation` | `none` (padrão — cards sem sombra) e `overlay` (somente drawer, modal e toast) |
| `statusColors` | pares fundo/texto/borda para `success`, `danger`, `info`, `warning`, `neutral` |

**Decisão:** o design não define cor de alerta amarela; `warning` usa `primaryTint` + texto `ink` (amarelo puro sobre branco não atinge 4,5:1).

## 3. Componentes criados — `src/components/ui/`

| Componente | Uso |
|---|---|
| `Button` | Variantes `primary · secondary · tertiary · destructive`, tamanhos `lg (56) · md (48) · icon (56×56)`, `loading` (desabilita e mostra spinner), ícone Feather à esquerda/direita. Pressionado escurece o fundo; desabilitado usa `disabledBg`/`disabledText`. `accessibilityRole/Label/State` automáticos. |
| `TextField` | Rótulo, ícones esquerdo/direito (ex.: mostrar senha), erro e dica. Altura 56, raio 16, borda 1px; em foco borda `ink` 2px (contorno padrão do navegador removido no web). Repassa todas as props de `TextInput` e encaminha `ref`. |
| `Card` | Superfície padrão (padding 16, raio 16, borda 1px, sem sombra). Variantes `default · alert · selected · muted`; vira `Pressable` quando recebe `onPress`. |
| `Chip` | Selo de status (altura 32, pill, 14 Bold) com `tone` semântico e ícone opcional. Sempre com texto. |
| `ShortcutCard` | "card/atalho" do design: slot de ícone 48 em `primaryTint`, label 18 Bold, apoio opcional; grid de 2 colunas. |
| `ScreenHeader` | Título de tela (`title`), subtítulo, botão voltar opcional e ação à direita. |
| `SegmentedControl` | Abas/segmentos com a opção ativa em pill `primary` (`accessibilityRole="tab"`). |
| `StateView` | Estados de feedback padronizados: `loading`, `empty`, `error` (ícone em slot, título, mensagem e ação opcional). |

Exportados por `src/components/ui/index.ts`.

## 4. Componentes existentes atualizados

| Arquivo | Mudança |
|---|---|
| `components/AppLayout.tsx` (novo) | Unifica o header + drawer que estavam triplicados. Menus por perfil em `MENU_ITEMS`. Item ativo destacado em `primaryTint`; "Sair" em `danger`. Mesma lógica de navegação (`navigate(key)` / `reset` para `Login`). |
| `DriverLayout`, `GuardianLayout`, `SchoolLayout` | Agora são wrappers finos de `AppLayout` (mesma API: `children`), então nenhuma tela precisou mudar o import. |
| `StatusBadge` | Mesma API (`status`, `variant`, `size`, `style`, `textStyle`); renderiza `Chip`. Exibe o status formatado (`EM_ANDAMENTO` → "Em andamento") — apenas apresentação. |
| `Toast` | Cores via `statusColors`, borda 2px, texto `ink`, `accessibilityLiveRegion`. Lógica de animação/tempo inalterada. |
| `ConfirmDialog`, `PasswordConfirmationModal` | Mesmas props; usam `Button`/`TextField`; ações empilhadas (confirmar acima, cancelar terciário); `onRequestClose` (voltar do Android) bloqueado durante `loading`. |
| `Logo` | Tokens + `accessibilityLabel`. |
| `App.tsx` | Fundo global `colors.background`; carrega somente Inter 400/700 (500/600 não são mais usados). |

## 5. Telas atualizadas

Todas as 26 telas em `src/screens` foram migradas para tokens. Resumo do que mudou visualmente:

| Tela | Principais mudanças |
|---|---|
| Login | Cartão com borda, `SegmentedControl` de perfil em pill amarela, `TextField` com ícones e mostrar senha, `Button` primary/secondary |
| Register | `TextField` em todos os campos, voltar como botão ícone, `Button` com loading |
| DriverMain / GuardianMain / SchoolMain | Saudação `display`, card de ação principal (motorista), grid de `ShortcutCard` 2 colunas, cards informativos com `Chip` |
| DriverTrips / DriverTripDetails | `ScreenHeader`, cards com borda e `Chip` Ativa/Inativa, bottom sheet com opções 56px, `StateView` vazio/carregando, ações `primary` + `destructive` |
| DriverAttendance / DriverAttendanceDetail | Timeline com tokens, ações de presença ≥ 48px (Embarcar = success, Desembarcar = info, Faltou = danger; texto branco no estado ativo), sheet de status com opções 56px |
| DriverAvailableDependents / DriverSearchStudents / DriverStudents / DriverInvites / DriverHistory | `ScreenHeader`, cards padronizados, botões ícone `secondary`, `Chip`, `StateView` |
| DriverVehicle / Profile / GuardianDependentForm | Formulários com `TextField`, seletores (escola, período) no padrão de campo, rádio de período com estado ativo `primary`, `Button` com loading |
| GuardianDependents / GuardianInvites / GuardianMonitoring / GuardianSearchDriver / GuardianPlans | `SegmentedControl` (convites), `Chip` de status/período, cards de monitoramento e histórico, `Button destructive` para encerrar vínculo, estados vazios |
| NoticeBoard / History / Placeholder | `ScreenHeader`, cards de aviso com slot de ícone e `Chip` "Novo" para não lidos, estados vazios |
| DriverRouteView (sem rota registrada) | Apenas tokens e correção de contraste |

Regras do design aplicadas em toda a aplicação:

- Cor só para destacar: `primary` = ação; semânticas = status; o resto é neutro.
- Cards sem sombra, borda 1px `#C9CFD8`, raio 16, padding 16; margem de tela 16.
- Alvos de toque ≥ 48px (padrão 56).
- Fonte mínima 14px; `maxFontSizeMultiplier` 1.3 nos componentes base.
- Texto sobre `primary` sempre `ink`; sobre `success`/`danger`/`info` sempre branco.
- Responsividade: mobile-first; conteúdo centralizado com `maxWidth` 800 (listas) / 600 (formulários) / 440 (login e cadastro) no desktop/web.
- Acessibilidade: `accessibilityRole`, `accessibilityLabel` e `accessibilityState` em botões, abas, rádios e itens de lista.

## 6. Funcionalidades preservadas

Verificação feita por auditoria automática do diff (HEAD × árvore de trabalho) comparando, por arquivo, chamadas de serviço, chamadas de navegação, setters de contexto, hooks de estado, handlers e a fiação de props de evento (`onPress`, `onChangeText`, `disabled`, `value`, `visible`…). Todas as diferenças são equivalências:

- `onPress={() => navigation.goBack()}` → `onBack={() => navigation.goBack()}` (`ScreenHeader`).
- `disabled={loading}` → `loading={loading}` (o `Button` desabilita quando `loading`).
- Abas de convites: `onPress={() => setActiveTab(...)}` → `SegmentedControl onChange={setActiveTab}`.
- Handlers do drawer movidos para `AppLayout` (o desvio `key === 'Home'` removido era inalcançável).
- Adicionado `onRequestClose` nos modais (botão voltar do Android fecha o modal) — comportamento novo e aditivo.

Arquivos de lógica **não tocados**: `src/services/*`, `src/context/AppContext.tsx`, `src/navigation/index.ts`, `src/types.ts`, registro de rotas em `App.tsx`.

| Módulo | Situação |
|---|---|
| Autenticação e perfis (Motorista, Responsável, Escola) | Preservado; login/logout validados no navegador |
| Cadastros (motorista, responsável, escola, veículo, dependente + vínculo com escola) | Preservado; mesmas chamadas e validações; confirmação por senha mantida |
| Viagens / rotas (criar, detalhar, iniciar viagem do dia, status, paradas, chamada/presença) | Preservado; fluxo completo validado no navegador |
| Monitoramento (status do dependente, motorista, histórico recente) | Preservado; validado no navegador |
| Vínculos e convites (aceitar, recusar, encerrar) | Preservado; validado no navegador |
| Notificações (mural de avisos) e histórico | Preservado |

## 7. Validação realizada

- `npx tsc --noEmit`: sem erros.
- Expo web (`npx expo start --web`, configurado em `.claude/launch.json`) em 390×844 e em desktop.
- O backend local (`localhost:8080`) **não envia cabeçalhos CORS**, então chamadas reais a partir do navegador falham (a tentativa de cadastro exibiu corretamente o toast de erro). Para validar as telas autenticadas, as respostas da API foram simuladas **somente dentro da aba do navegador** (nenhum código do projeto foi alterado para isso). Fluxos percorridos: login motorista → home → drawer → viagens → detalhes → iniciar viagem → chamada → sheet de status → logout → login responsável → home → monitoramento → convites (2 abas) → diálogo de encerrar vínculo → dependentes → edição → modal de senha.
- Console do navegador: nenhum erro além dos de CORS mencionados.

**Não validado:** gravações reais contra o backend e execução em dispositivo físico/emulador (iOS/Android) — recomenda-se um teste no Expo Go.

## 8. Pendências e problemas conhecidos

Encontrados durante o trabalho e **mantidos como estavam** (fora do escopo visual):

1. **CORS no backend:** a versão web não consegue chamar a API local. Configurar CORS no backend (ou um proxy de desenvolvimento) para testar o web.
2. **`DriverSearchStudentsScreen`** navega para `'DriverRoute'`, rota que não existe em `RootStackParamList`/`App.tsx`.
3. **`DriverRouteViewScreen`** é importada em `App.tsx`, mas não está registrada no navegador (código sem uso).
4. **Dados fixos no código:** `DriverInvitesScreen` (convites mock + `AsyncStorage`) e `GuardianSearchDriverScreen` (motoristas mock, sem serviço).
5. **`HistoryScreen` (GuardianHistory)** e **`GuardianPlansScreen`** são telas "em implementação"; perfil Escola ainda é placeholder.
6. **Geolocalização:** não há mapa nem localização no app; o "topo fixo com mapa" do mock não foi implementado (o monitoramento é por status).
7. **Permissões:** o acesso por perfil é feito apenas pelo menu; não há guarda de rota. O estado `userRole` em `App.tsx` não é lido.
8. **Navegação por abas inferiores** (5 abas do design) não foi adotada por decisão do projeto — o drawer foi mantido e restilizado. Migrar exige `@react-navigation/bottom-tabs` e reorganização de rotas.
9. **Ícones:** o design cita Ionicons; o projeto mantém Feather (já usado em todas as telas).
10. **Dependências sem uso** no `package.json`: `lucide-react-native`, `postcss`, `autoprefixer`.

## 9. Como usar o Design System em telas novas

```tsx
import { Button, Card, Chip, ScreenHeader, StateView, TextField } from '../components/ui';
import { colors, layout, spacing, typography } from '../theme';

<ScreenHeader title="Minha tela" onBack={() => navigation.goBack()} />
<Card>
  <Text style={{ ...typography.heading, color: colors.ink }}>Rota da manhã</Text>
  <Chip label="Em rota" tone="info" />
  <Button label="Abrir rota" size="md" onPress={...} fullWidth />
</Card>
```

- Nunca use cores, fontes ou espaçamentos literais — importe de `src/theme`.
- Um `Button` primary por tela; ações irreversíveis com `destructive` e `ConfirmDialog`.
- Estados de carregando/vazio/erro com `StateView`.
