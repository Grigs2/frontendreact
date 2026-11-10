# Implementação do Fluxo de Acordo Motorista–Responsável–Escola (Front-end)

Branch: `feat/fluxo_acordo_motorista_responsavel`
Documentação do back-end: [IMPLEMENTACAO_ACORDO_MOTORISTA_RESPONSAVEL_BACK.md](../../BackEndJava/Docs/IMPLEMENTACAO_ACORDO_MOTORISTA_RESPONSAVEL_BACK.md)

## 1. Resumo

Este documento descreve as alterações do front-end (Expo / React Native) para o fluxo de acordo entre Motorista, Responsável e Escola, incluindo viagens com várias escolas e nome editável.

## 2. Configuração de execução

- Variável de ambiente: `EXPO_PUBLIC_API_URL` (definida em `src/services/config.ts`).
  - Padrão: `http://localhost:8080/TioDaPerua/api`.
  - Para testar pelo celular, use o IP da máquina na rede local.
- Comando para rodar com acesso pelo celular (PowerShell, dentro de `frontendreact`):

```powershell
$env:EXPO_PUBLIC_API_URL='http://192.168.15.9:8090/TioDaPerua/api'; npx expo start --lan --port 8081
```

- No Expo Go, conecte pelo QR code ou pela URL `exp://192.168.15.9:8081`.
- Requisitos: Node 22.13 ou superior (a máquina de teste estava com Node 20.19, o que gera aviso).
- O celular precisa estar no mesmo Wi-Fi, e o perfil de rede deve ser Privado ou a porta 8090 deve estar liberada no firewall.

## 3. Alterações

### 3.1 Serviços
- `src/services/api.ts`: novo endpoint `atualizarNomeViagem` (`PUT /Viagem/AtualizarNome/{id}`).
- `src/services/viagemService.ts`:
  - `escolasNomes(viagem)`: lista os nomes das escolas da viagem.
  - `viagemNome(viagem)`: usa `escolasNomes` para o nome padrão.
  - `criar(idMotorista, periodo, escolaIds, nome?)`: cria viagem com várias escolas.
  - `atualizarNome(idViagem, nome)`: renomeia; nome vazio restaura o padrão.

### 3.2 Tipos
- `src/types.ts`:
  - `ViagemDTO.escolas` (lista de `EscolaResumoDTO`).
  - `ViagemDTO.nome` (nome customizado, opcional).

### 3.3 Telas do motorista
- `DriverTripsScreen.tsx`:
  - Seleção de várias escolas, com chips para adicionar e remover.
  - Campo de busca de escolas.
  - Campo opcional de nome, com prévia do nome padrão.
- `DriverTripDetailsScreen.tsx`:
  - Lista de escolas da viagem.
  - Campo "Nome da viagem" editável, com botão "Salvar nome". Campo vazio restaura o padrão.
- `DriverSearchStudentsScreen.tsx` e `DriverAvailableDependentsScreen.tsx`:
  - Usam `escolasNomes(viagem)` para exibir as escolas.
  - O aviso de viagem legada verifica `!selected.escolas?.length`.

### 3.4 Telas do responsável
- `GuardianSearchDriverScreen.tsx`:
  - Marca como "outra escola" quando a escola do dependente não está em `viagem.escolas`.
  - A aba "Próximos" passa a exibir motoristas que atendem a escola do dependente (correção do back).

## 4. Validação

- `npx tsc --noEmit` na pasta `frontendreact`: sem erros.
- Validação visual nas telas ainda pendente de confirmação pelo usuário no Expo Go.

## 5. Pendências

- Telas de validação de documentos pela escola (não implementadas).
- Telas de envio de documentos pelo motorista para a escola (não implementadas).
- Hoje a validação de documentos é feita apenas pelo admin, via API.
