# Alterações: viagem iniciada, histórico da viagem e Rotas

Documento de referência das mudanças feitas no fluxo do motorista. Nada foi commitado.

## 1. Viagem iniciada: navegação entre alunos

**Arquivo:** [DriverAttendanceScreen.tsx](/workspaces/frontendreact/src/screens/DriverAttendanceScreen.tsx)

**Problema:** o motorista conseguia alternar, com as setas ou pelo swipe, para paradas de alunos já embarcados, desembarcados ou faltosos. A tela mostrava o card "Embarque de X" sem nenhum botão ativo.

**Causa:** o índice manual (`indiceManual`) navegava por todas as paradas, inclusive as concluídas.

**Correção:**
- Navegação passa a usar `indicesPendentes`, que contém apenas as paradas pendentes na etapa atual.
- Quando não resta aluno pendente, o card de destino mostra "Todos os alunos registrados" com a orientação "Embarques e desembarques concluídos. Finalize a viagem abaixo.".

## 2. Regras de "Faltou" e desembarque

**Arquivo:** [DriverAttendanceScreen.tsx](/workspaces/frontendreact/src/screens/DriverAttendanceScreen.tsx)

- O botão "Faltou" só aparece para alunos `ESPERANDO`.
- Desembarque só é permitido para alunos `EMBARCADO`.
- A função `marcar` tem uma guarda que recusa a transição inválida.
- A validação usa `podeRegistrarOffline`, que se baseia em `TRANSICOES_OFFLINE` de [offlineQueue.ts](/workspaces/frontendreact/src/services/offlineQueue.ts):
  - `ESPERANDO` → `EMBARCADO` ou `FALTOU`
  - `EMBARCADO` → `DESEMBARCADO`

## 3. Histórico da viagem: endereço em viagem de volta

**Arquivo:** [DriverTripDetailsScreen.tsx](/workspaces/frontendreact/src/screens/DriverTripDetailsScreen.tsx)

**Problema:** em viagem de volta, o embarque mostrava o endereço do aluno e o desembarque mostrava a escola, ao contrário.

**Causa:** `localDoAluno` assumia sempre a direção de ida.

**Correção:** `localDoAluno` usa a flag `ida` da viagem para escolher a parada correta:
- Ida: embarque no endereço do aluno, desembarque na escola.
- Volta: embarque na escola, desembarque no endereço do aluno.
- Falta: mostra a escola.

**Histórico concluído:** a regra é aplicada no momento da renderização. Os nomes e endereços das paradas continuam vindo do back (`buscarParadasViagemDia`), e os eventos vêm de `HistoricoViagemPresencaDTO`. Não há alteração de dados no back.

**Também nesta tela:**
- Eventos `FALTOU` aparecem como "Falta: <nome>" no histórico concluído.
- Concluída mostra Programada, Em andamento e os eventos de embarque, desembarque e falta em ordem cronológica, com o card de resumo por último.
- Cancelada mostra o item Cancelada e depois Programada.

## 4. Botão Voltar na tela Rotas

**Arquivo:** [DriverTripsScreen.tsx](/workspaces/frontendreact/src/screens/DriverTripsScreen.tsx)

O `ScreenHeader` recebe `onBack`:

```tsx
<ScreenHeader
  title="Rotas"
  onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DriverMain'))}
/>
```

Se não houver tela anterior no histórico, o botão leva para `DriverMain`.

## Validação

- `npx tsc --noEmit` passou.
- No navegador, com `motorista.rj`:
  - Navegação da viagem iniciada não entra mais em paradas concluídas.
  - "Faltou" some para alunos já embarcados.
  - Desembarque lista só alunos embarcados.
  - Histórico de Manhã · volta mostra escola no embarque e endereço do aluno no desembarque.
  - O botão Voltar de Rotas volta para a Home.

## Outros arquivos modificados (sessões anteriores, ainda não commitados)

- [DriverAvailableDependentsScreen.tsx](/workspaces/frontendreact/src/screens/DriverAvailableDependentsScreen.tsx)
- [DriverMainScreen.tsx](/workspaces/frontendreact/src/screens/DriverMainScreen.tsx)
- [DriverSearchStudentsScreen.tsx](/workspaces/frontendreact/src/screens/DriverSearchStudentsScreen.tsx)
- [DriverStudentsScreen.tsx](/workspaces/frontendreact/src/screens/DriverStudentsScreen.tsx)
- [navigation/index.ts](/workspaces/frontendreact/src/navigation/index.ts)
- [format.ts](/workspaces/frontendreact/src/utils/format.ts)
- [statusLabels.ts](/workspaces/frontendreact/src/utils/statusLabels.ts)

## Pendências em aberto

- Confirmar com o back se o endereço da parada é um snapshot na criação da viagem ou é resolvido a partir do endereço atual do aluno.
- Decidir se o atalho "Documentos, 3 pendências" na Home deve sair.
- Decidir se a viagem cancelada deve mostrar locais no histórico.
