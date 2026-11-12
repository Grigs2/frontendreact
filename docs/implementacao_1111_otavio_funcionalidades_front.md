# Guia de implementação do frontend — funcionalidades da listagem

**Data:** 11/11/2026
**Escopo:** aplicativo `FrontEnd/frontendreact` (Expo + React Native + TypeScript).
**Base funcional:** `Docs/listagem das funcionalidades.md`.
**Base técnica:** backend `BackEnd/BackEndJava`, já atualizado para a listagem (ver `Docs/Implementacao_3110_otavio_funcionalidades_faltantes.md`, fases 0 a 11).

Este guia diz, para cada item da listagem, o que o app já faz, qual endpoint do backend atende o item e o que falta implementar no front. As fases no final organizam a execução em entregas incrementais.

---

## 1. Fontes e ordem de precedência

Quando houver divergência, seguir nesta ordem:

1. **Código do backend** (controllers, DTOs e services em `BackEnd/BackEndJava/src/main/java/TioDaPerua/BackEndJava`). É ele que define contratos, estados e mensagens.
2. **Decisões registradas** no guia do backend (`Docs/Implementacao_3110_otavio_funcionalidades_faltantes.md`, seção 4).
3. **Convenções do front** em `FrontEnd/frontendreact/GEMINI.md` e nos documentos de `FrontEnd/frontendreact/docs/`.
4. **Listagem de funcionalidades**: define o escopo, mas parte dela foi decidida de outro jeito no backend (ver seção 4 deste guia).

---

## 2. Estado atual do frontend

### 2.1 O que já existe e deve ser reaproveitado

| Camada | Arquivos | Observação |
|---|---|---|
| Cliente HTTP | `src/services/api.ts` | Axios com Bearer, renovação proativa e reativa do token, lista de rotas públicas, mapa `API_ENDPOINTS`. |
| Sessão | `src/services/authSession.ts`, `src/services/authService.ts` | Access token em memória; refresh token no SecureStore (AsyncStorage no web); restauração de sessão; logout com revogação; troca de senha; recuperação de senha; reaceite de termos. |
| Serviços de domínio | `motoristaService`, `responsavelService`, `escolaService`, `viagemService`, `notificacaoService`, `pushService`, `cepService`, `dependenteService` | Cobrem cadastro, veículo, solicitações de transporte, endereços do dependente, ausências, histórico, viagens, presença, notificações e push. |
| Estado global | `src/context/AppContext.tsx` | Usuário/perfil, contagem de não lidas, viagem ativa, paradas, toast. |
| Navegação | `App.tsx`, `src/navigation/index.ts` | Stack único; `RootStackParamList`; `HOME_BY_ROLE` (sem ADMIN). |
| UI | `src/components/ui/*`, `src/components/forms/*`, `src/theme` | Button, Card, Chip, ListRow, ScreenHeader, SegmentedControl, StateView, TextField; AddressForm, Checkbox, PasswordStrength, StepIndicator, TermsModal. |
| Utilitários | `src/utils/masks.ts`, `src/utils/validators.ts`, `src/utils/apiError.ts` | Máscaras e validações de CPF/CNPJ/telefone/CEP/data; mensagens de erro da API. |
| Componentes globais | `SessionExpiryHandler`, `TermsReacceptGate`, `PushNotificationsHandler`, `Toast` | Já montados em `App.tsx`. |

### 2.2 Telas existentes

- **Público:** `LoginScreen`, `RegisterScreen` (três perfis), `ForgotPasswordScreen`, `ForgotPasswordCodeScreen`, `ResetPasswordScreen`.
- **Motorista:** `DriverMainScreen`, `DriverTripsScreen`, `DriverTripDetailsScreen`, `DriverAvailableDependentsScreen`, `DriverAttendanceScreen`, `DriverAttendanceDetailScreen`, `DriverRouteViewScreen`, `DriverStudentsScreen`, `DriverInvitesScreen`, `DriverSearchStudentsScreen`, `DriverVehicleScreen`, `DriverHistoryScreen`.
- **Responsável:** `GuardianMainScreen`, `GuardianDependentsScreen`, `GuardianDependentFormScreen`, `GuardianSearchDriverScreen`, `GuardianInvitesScreen`, `GuardianMonitoringScreen`, `HistoryScreen`, `GuardianPlansScreen`.
- **Escola:** `SchoolMainScreen` (atalhos para avisos e perfil apenas).
- **Comuns:** `ProfileScreen` (três perfis), `NotificationListScreen`, `NotificationCreateScreen`, `NoticeBoardScreen`, `PlaceholderScreen` (usado em "Ajuda").

### 2.3 Lacunas técnicas gerais

- **Nenhum endpoint das fases 2 (documentos), 4 (rede de responsáveis), 5 (vínculo motorista–escola), 6 (agenda, prontidão, preparação, reordenação), 8 (GPS e consentimento), 9 (offline) e 11 (ADMIN)** está mapeado em `API_ENDPOINTS` ou em um service.
- **Perfil ADMIN** não é aceito: `authService.carregarPerfil` lança `PerfilNaoSuportadoError` para `ADMIN`, e não existe `GET /Admin/Perfil` no backend.
- **Sem bibliotecas de localização, mapa, conectividade ou UUID**: faltam `expo-location`, `react-native-maps`, `@react-native-community/netinfo` e `expo-crypto`.
- **`src/types.ts`** não tem os tipos dos DTOs novos (listados na seção 5.2).
- **Endereços do dependente:** o service usa POST/PUT, mas não usa o `DELETE` (desativar), e não trata `finalidade`/`statusValidacao` em todas as telas.

---

## 3. Mapa de endpoints do backend usados neste guia

Base: `BASE_URL` (`/TioDaPerua/api`). Todas as rotas exigem Bearer, exceto as já marcadas como públicas em `api.ts`.

### 3.1 Endpoints novos que precisam entrar em `API_ENDPOINTS`

| Grupo | Método e rota | Corpo / parâmetros | Resposta |
|---|---|---|---|
| Documentos | `GET /Motorista/{id}/Documentos` | — | `DocumentoMotoristaDTO[]` |
| Documentos | `POST /Motorista/{id}/Documentos` | `{ tipo: 'CNH'\|'VISTORIA'\|'LICENCIAMENTO', numero, categoria?, dataRealizacao?, dataValidade }` | `DocumentoMotoristaDTO` |
| Vínculo escola (motorista) | `POST /Motorista/Escolas/Vinculos` | `{ cnpj }` | `VinculoEscolaDTO` |
| Vínculo escola (motorista) | `GET /Motorista/Vinculos` | — | `VinculoEscolaDTO[]` |
| Vínculo escola (motorista) | `GET /Motorista/Vinculos/Pendentes` | — | `VinculoEscolaDTO[]` (convites da escola) |
| Vínculo escola (motorista) | `GET /Motorista/Vinculos/{id}/Historico` | — | `HistoricoVinculoEscolaDTO[]` |
| Vínculo escola (motorista) | `POST /Motorista/Vinculos/{id}/Aceitar` \| `/Recusar` \| `/Encerrar` | `{ motivo? }` (obrigatório em Recusar/Encerrar) | `VinculoEscolaDTO` |
| Vínculo escola (escola) | `POST /Escola/Vinculos/Motoristas/Buscar` | `{ email }` **ou** `{ cpf }` (exatamente um) | `MotoristaBuscaDTO[]` (`id`, `nome`) |
| Vínculo escola (escola) | `POST /Escola/Vinculos` | `{ motoristaId }` | `VinculoEscolaDTO` |
| Vínculo escola (escola) | `GET /Escola/Vinculos` \| `GET /Escola/Vinculos/Pendentes` | — | `VinculoEscolaDTO[]` |
| Vínculo escola (escola) | `GET /Escola/Vinculos/{id}/Historico` | — | `HistoricoVinculoEscolaDTO[]` |
| Vínculo escola (escola) | `POST /Escola/Vinculos/{id}/Aprovar` \| `/Recusar` \| `/Suspender` \| `/Reativar` \| `/Encerrar` | `{ motivo? }` (obrigatório em Recusar/Suspender/Encerrar; máx. 500) | `VinculoEscolaDTO` |
| Endereços | `DELETE /Responsavel/Dependente/{id}/Enderecos/{idEndereco}` | — | 204 |
| Rede de responsáveis | `POST /Responsavel/Dependente/{id}/Convites` | `{ email, categoria: 'PAI'\|'MAE'\|'RESPONSAVEL_LEGAL'\|'OUTRO' }` | `ConviteResponsavelDTO` |
| Rede de responsáveis | `GET /Responsavel/Convites/Pendentes` | — | `ConviteResponsavelDTO[]` (recebidos) |
| Rede de responsáveis | `GET /Responsavel/Dependente/{id}/Convites` | — | `ConviteResponsavelDTO[]` (histórico) |
| Rede de responsáveis | `GET /Responsavel/Dependente/{id}/Responsaveis` | — | `VinculoResponsavelDTO[]` |
| Rede de responsáveis | `PUT /Responsavel/Convites/{id}/Aceitar` \| `/Recusar` | — | `ConviteResponsavelDTO` |
| Rede de responsáveis | `DELETE /Responsavel/Dependente/{id}/Responsaveis/{idResponsavel}` | — | 204 |
| Viagem — agenda | `GET /Viagem/Agenda/{idMotorista}` | — | `AgendaViagemDTO[]` (janela de 7 dias) |
| Viagem — prontidão | `GET /Viagem/Prontidao/{idViagem}` | — | `ProntidaoViagemDTO` (`pronta`, `bloqueios[]`) |
| Viagem — preparar | `POST /Viagem/PrepararViagemDia/{idViagem}` | `{ data: 'yyyy-MM-dd' }` (hoje até +6 dias) | `ViagemDiaDTO` (idempotente por data) |
| Viagem — reordenar | `PUT /Viagem/ReordenarParadasViagemDia/{idViagemDia}` | `{ idsParadas: number[] }` (todas as paradas, nova ordem) | `ParadaDTO[]` |
| Viagem — históricos | `GET /Viagem/HistoricoStatusViagemDia/{id}` | — | `HistoricoViagemDiaDTO[]` |
| Viagem — históricos | `GET /Viagem/HistoricoOrdemParadas/{id}` | — | `HistoricoOrdemParadaDTO[]` |
| GPS — consentimento | `PUT /Viagem/Localizacao/Consentimento/Motorista` | `{ aceito: boolean }` | `ConsentimentoLocalizacaoDTO` |
| GPS — consentimento | `PUT /Viagem/Localizacao/Consentimento/Dependente/{idDependente}` | `{ aceito: boolean }` | `ConsentimentoLocalizacaoDTO` |
| GPS — consentimento | `GET /Viagem/Localizacao/Consentimento/Execucao/{idViagemDia}` | — | `EstadoConsentimentoLocalizacaoDTO` |
| GPS — posição | `PUT /Viagem/Localizacao` | `{ idViagemDia, latitude, longitude, instanteDispositivo (ISO UTC) }` | `LocalizacaoViagemDTO` |
| GPS — posição | `GET /Viagem/Localizacao/Atual/{idViagemDia}` | — | `LocalizacaoViagemDTO` (`desatualizada` após 45 s) |
| GPS — histórico | `GET /Viagem/Localizacao/Historico/{idViagemDia}` | `inicio`, `fim` (ISO, últimos 7 dias), `pagina`, `tamanho` (1–500) | `Page<LocalizacaoViagemDTO>` |
| Offline | `POST /Viagem/SincronizarPresencasOffline` | `{ eventos: EventoPresencaOfflineDTO[] }` (1–100) | `{ resultados: ResultadoEventoPresencaDTO[] }` |
| ADMIN | `GET /Admin/Documentos/Pendentes` | — | `DocumentoMotoristaDTO[]` |
| ADMIN | `PUT /Admin/Documentos/{id}/Revisar` | `{ status: 'APROVADO'\|'RECUSADO', motivoRecusa? }` | `DocumentoMotoristaDTO` |
| ADMIN | `GET /Admin/Dependentes/ResponsavelCriadorPendentes` | — | `DependenteResponsavelCriadorPendenteDTO[]` |
| ADMIN | `PUT /Admin/Dependentes/{id}/ResponsavelCriador` | `{ responsavelId }` | 204 |
| ADMIN | `GET /Admin/Usuarios` | `id?`, `tipoPerfil?`, `email?` (exato), `suspensa?`, `pagina`, `tamanho` | `Page<AdminUsuarioResumoDTO>` |
| ADMIN | `GET /Admin/Escolas` | `nome?`, `cnpj?`, `suspensa?`, `pagina`, `tamanho` | `Page<AdminEscolaResumoDTO>` |
| ADMIN | `GET /Admin/Vinculos/MotoristaEscola` | `escolaId?`, `motoristaId?`, `status?`, paginação | `Page<AdminVinculoMotoristaEscolaDTO>` |
| ADMIN | `GET /Admin/Vinculos/ResponsavelDependente` | `dependenteId?`, `responsavelId?`, paginação | `Page<AdminVinculoResponsavelDTO>` |
| ADMIN | `GET /Admin/Auditoria` | `atorId?`, `acao?`, `tipoAlvo?`, `alvoId?`, `inicio?`, `fim?`, paginação | `Page<AdminAuditoriaDTO>` |
| ADMIN | `PUT /Admin/Usuarios/{id}/Suspender` | `{ motivo }` (obrigatório, máx. 1000) | 204 |
| ADMIN | `PUT /Admin/Usuarios/{id}/Reativar` | `{ motivo? }` | 204 |

Endpoints já existentes no backend e ainda não usados pelo front, mas úteis: `GET /Responsavel/Motorista/{id}/Avaliacoes` e `POST /Responsavel/AvaliarMotorista/{id}` (fora da listagem; não priorizar).

### 3.2 Regras do backend que o front precisa refletir

- **Estados da execução (`StatusViagemDia`):** `PLANEJADA → EM_ANDAMENTO → FINALIZADA | INTERROMPIDA`; `PLANEJADA → CANCELADA`. Sem reabertura. Motivo obrigatório para `CANCELADA` e `INTERROMPIDA` (máx. 1000).
- **Iniciar (`EM_ANDAMENTO`)** falha com `"Execução bloqueada: ..."` se houver bloqueios de prontidão (documentos, veículo, capacidade, endereços, vínculo ativo com escola).
- **Finalizar** só quando todas as presenças estiverem `DESEMBARCADO` ou `FALTOU`.
- **Presença (`StatusViagemPresenca`):** `ESPERANDO → EMBARCADO | FALTOU`; `EMBARCADO → DESEMBARCADO`. Repetir o mesmo status é idempotente. Permitido só com a execução `PLANEJADA` ou `EM_ANDAMENTO`.
- **Reordenação:** a lista deve conter todas as paradas exatamente uma vez; paradas inicial/final do motorista e paradas já concluídas não podem mudar de posição.
- **GPS:** só com execução `EM_ANDAMENTO`; intervalo mínimo de 15 s (409 se menor); instante do dispositivo não pode estar no futuro nem atrasado; precisa do consentimento do motorista e de ao menos um responsável ativo por dependente; revogação suspende o GPS da execução inteira (`gpsSuspenso`); sem `GPS_CONSENT_VERSION` configurada o backend responde **503**.
- **Documentos:** `VENCIDO` é calculado na resposta; vistoria exige `dataRealizacao` (não futura, anterior à validade); vistoria e licenciamento exigem veículo cadastrado; editar o veículo invalida vistoria/licenciamento aprovados.
- **Vínculo motorista–escola (`StatusVinculoEscola`):** `PENDENTE_ESCOLA`, `PENDENTE_MOTORISTA`, `ATIVO`, `RECUSADO`, `SUSPENSO`, `ENCERRADO`. Apenas o destinatário aceita/recusa; escola suspende/reativa; ambos encerram. Uma pendência por par.
- **Rede de responsáveis:** só o responsável criador convida; convite para conta de responsável existente; expira em 7 dias; revogar exige que o criador não seja o alvo sem outro criador atribuído.
- **Idade mínima do motorista no backend: 18 anos** (a listagem pede 21 — ver seção 4).
- **Erros:** `ErrorResponseDTO { status, error, message, path }`; `getApiErrorMessage` já trata.

---

## 4. Divergências entre a listagem e o backend (decidir antes de codar)

Não implementar suposições. Registrar a decisão neste documento ao resolver cada ponto.

| # | Item da listagem | Situação no backend | Recomendação para o front |
|---|---|---|---|
| D1 | 2.1.3 — motorista com 21 anos ou mais | Backend valida **18** anos (decisão 15). | Alinhar com o grupo. Enquanto não houver decisão, usar 18 no front (`validateBirthDate(value, 18)`) para não aceitar no app o que o backend rejeita, ou rejeitar o que ele aceita. Se decidirem 21, alterar backend e front juntos. |
| D2 | 2.2.4 / 2.3.6 — anexar documento e foto do veículo | Sem upload (decisão 3). Só metadados. | Não criar upload. Exibir apenas os campos de metadados. |
| D3 | 2.2.5 — curso de especialização para condutores escolares | Não incluído (decisão 3). | Não implementar. Pode-se exibir um texto informativo estático, sem campo. |
| D4 | 2.3.3 — marca do veículo; 2.3.7 — data da última vistoria | `VeiculoDTO` não tem `marca`. Vistoria é um documento (`tipo=VISTORIA`, `dataRealizacao`). | Vistoria entra pela tela de documentos. Marca: omitir ou pedir campo ao backend. |
| D5 | 3.3.6 — observações, alergia, deficiência | `DependenteDTO` não tem esses campos. | Bloqueado no backend. Não criar campos que não persistem. Item 6.1.4 fica parcial pelo mesmo motivo. |
| D6 | 3.1.9 — confirmar contato | Fora do escopo (fase 3). | Não implementar. |
| D7 | 4.1.9 / 4.1.10 / 4.5.4 / 10.3.2 / 10.3.4 — aprovação do cadastro da escola | Não existe status de aprovação da conta escolar; ADMIN só suspende/reativa usuários. | Exibir na escola apenas "conta ativa/suspensa" (via erro de login). Aprovação de cadastro fica bloqueada no backend. |
| D8 | 5.4 — otimizar rota (distância, duração, ETA, mapa da rota) | Rota manual, sem provedor (decisão 9). | Implementar só ordenação manual (5.4.7–5.4.10). Distância/duração/ETA ficam bloqueados. O mapa mostra os pontos e a posição atual, sem traçado calculado. |
| D9 | 5.2.3 — selecionar veículo autorizado | 1 veículo por motorista (decisão 5). | Mostrar o veículo do motorista em modo leitura; sem seletor. |
| D10 | 5.7.4 / 6.1.5 — aviso de proximidade (50 m) | Backend não calcula proximidade. | Calcular no aparelho a partir da posição atual e do endereço da parada **somente se** a parada tiver coordenadas. Hoje `ParadaDTO` não tem latitude/longitude, então fica bloqueado até haver geocodificação. Nunca usar proximidade para marcar embarque. |
| D11 | 5.8 — alterar rota durante a viagem com motivo e notificação | Reordenação durante a execução existe, com histórico; não há campo de motivo nem notificação. | Implementar reordenação durante a execução; motivo e notificação ficam bloqueados no backend. |
| D12 | 11.2.1 — preferências de notificação | Sem preferências (decisão 12). | Mostrar apenas o estado da permissão de push do sistema. |
| D13 | 11.2.4 / 11.2.5 / 10.2.7 — pedir correção de dados, encerrar conta, denúncias | Sem endpoints. | Bloqueado. Exibir orientação de contato por texto, se o grupo quiser. |
| D14 | 7.3.4 / 7.3.5 — retenção e anonimização | Feito no backend (7 dias para GPS). | Nada no front além de informar o prazo na tela de privacidade. |
| D15 | 9.2.8 / 9.2.9 — notificação de localização desatualizada e de pendência de sincronização | Backend não gera essas notificações. | Tratar como aviso local na tela (banner), não como notificação da central. |
| D16 | 3.7.8 — responsável registrar ausência | Existe como **aviso de ausência** prévio (`/Ausencias`), não como presença `FALTOU`. | Manter o fluxo de ausências já existente. |
| D17 | Administrador no app | Login ADMIN funciona; não há `GET /Admin/Perfil`. | Usar o `perfil` retornado pelo login/refresh. Recomenda-se uso pelo navegador (web). |

---

## 5. Fundação técnica (fazer antes das telas)

### 5.1 Dependências

Instalar com `npx expo install` para obter as versões compatíveis com o SDK do projeto (não fixar versões à mão):

```bash
npx expo install expo-location react-native-maps @react-native-community/netinfo expo-crypto
```

- `expo-location`: permissão e leitura do GPS (7.1).
- `react-native-maps`: mapa no Android/iOS. **No web não funciona**; criar `MapView.web.tsx` com fallback (lista de pontos + link "abrir no mapa" com `https://www.openstreetmap.org/?mlat=..&mlon=..`).
- `@react-native-community/netinfo`: estado online/offline (8.1).
- `expo-crypto`: `Crypto.randomUUID()` para gerar UUID v4 dos eventos offline (8.2).

Atualizar `app.json`:

```json
"plugins": [
  ["expo-location", {
    "locationWhenInUsePermission": "O Tio da Perua usa sua localização durante uma viagem em andamento para que os responsáveis acompanhem o trajeto."
  }]
]
```

Não pedir permissão de localização em segundo plano nesta etapa (só "durante o uso"). Coleta com o app em segundo plano exige `expo-task-manager` e revisão de privacidade; registrar como evolução futura.

### 5.2 Tipos (`src/types.ts`)

Adicionar, espelhando os records Java:

```ts
export type StatusDocumento = 'PENDENTE' | 'APROVADO' | 'RECUSADO' | 'VENCIDO';
export type TipoDocumento = 'CNH' | 'VISTORIA' | 'LICENCIAMENTO';
export interface DocumentoMotoristaDTO {
  id: number; tipo: TipoDocumento; numero: string; categoria?: string | null;
  dataRealizacao?: string | null; dataValidade: string; status: StatusDocumento;
  submetidoEm: string; substituidoEm?: string | null; revisadoEm?: string | null;
  revisadoPorId?: number | null; motivoRecusa?: string | null;
}
export interface SubmeterDocumentoDTO {
  tipo: TipoDocumento; numero: string; categoria?: string;
  dataRealizacao?: string; dataValidade: string;
}

export type StatusVinculoEscola =
  'PENDENTE_ESCOLA' | 'PENDENTE_MOTORISTA' | 'ATIVO' | 'RECUSADO' | 'SUSPENSO' | 'ENCERRADO';
export interface VinculoEscolaDTO {
  id: number; escolaId: number; escolaNome: string; escolaCnpj: string;
  motoristaId: number; motoristaNome: string; status: StatusVinculoEscola;
  criadoEm: string; atualizadoEm: string;
}
export interface HistoricoVinculoEscolaDTO {
  id: number; vinculoId: number; statusAnterior: string | null; statusNovo: string;
  atorUsuarioId: number; perfilAtor: string; motivo?: string | null; ocorridoEm: string;
}
export interface MotoristaBuscaDTO { id: number; nome: string; }

export type CategoriaVinculoResponsavel = 'PAI' | 'MAE' | 'RESPONSAVEL_LEGAL' | 'OUTRO';
export type StatusConviteResponsavel = 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'EXPIRADO' | 'REVOGADO';
export interface ConviteResponsavelDTO {
  id: number; dependenteId: number; dependenteNome: string;
  convidadoId: number; convidadoNome: string; convidadoEmail: string;
  convidadorId?: number | null; convidadorNome?: string | null;
  categoria: CategoriaVinculoResponsavel | null; status: StatusConviteResponsavel;
  criadoEm: string; expiraEm: string; respondidoEm?: string | null; revogadoEm?: string | null;
}
export interface VinculoResponsavelDTO {
  responsavelId: number; nome: string; email?: string | null;
  categoria?: CategoriaVinculoResponsavel | null; responsavelCriador: boolean; vinculadoEm?: string | null;
}

export type StatusViagemDia = 'PLANEJADA' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA' | 'INTERROMPIDA';
export type StatusViagemPresenca = 'ESPERANDO' | 'EMBARCADO' | 'DESEMBARCADO' | 'FALTOU';
export interface AgendaViagemDTO {
  idViagem: number; periodo: string; data: string;
  idViagemDia: number | null; status: StatusViagemDia | null; materializada: boolean;
}
export interface ProntidaoViagemDTO { idViagem: number; pronta: boolean; bloqueios: string[]; }
export interface HistoricoViagemDiaDTO {
  id: number; statusAnterior: StatusViagemDia | null; statusNovo: StatusViagemDia;
  atorUsuarioId: number; ocorridoEm: string; motivo?: string | null;
}
export interface HistoricoOrdemParadaDTO {
  id: number; idParada: number; ordemAnterior: number; ordemNova: number;
  atorUsuarioId: number; ocorridoEm: string;
}
export interface HistoricoViagemPresencaDTO {
  id: number; idPresenca: number; idDependente: number;
  statusAnterior: StatusViagemPresenca; statusNovo: StatusViagemPresenca;
  atorUsuarioId: number; ocorridoEm: string;
  eventoClienteId?: string | null; instanteDispositivo?: string | null; recebidoEm?: string | null;
}

export interface ConsentimentoLocalizacaoDTO { aceito: boolean; versaoPolitica: string | null; ocorridoEm: string | null; }
export interface EstadoConsentimentoLocalizacaoDTO {
  idViagemDia: number; versaoPolitica: string | null; motoristaConsentiu: boolean;
  dependentesPendentes: number[]; gpsSuspenso: boolean; podeAtualizar: boolean;
}
export interface LocalizacaoViagemDTO {
  idViagemDia: number; latitude: number; longitude: number;
  instanteDispositivo: string; recebidoEm: string; desatualizada: boolean;
}

export type StatusEventoSincronizacao = 'APLICADO' | 'DUPLICADO' | 'CONFLITO' | 'REJEITADO';
export interface EventoPresencaOfflineDTO {
  idEvento: string; idViagemDia: number; idDependente: number;
  statusEsperado: StatusViagemPresenca; statusNovo: StatusViagemPresenca; ocorridoEm: string;
}
export interface ResultadoEventoPresencaDTO {
  idEvento: string; idViagemDia: number; idDependente: number;
  resultado: StatusEventoSincronizacao; statusAtual: StatusViagemPresenca | null; mensagem?: string | null;
}

export interface Page<T> {
  content: T[]; totalElements: number; totalPages: number; number: number; size: number;
}
export interface AdminUsuarioResumoDTO { id: number; tipoPerfil: TipoPerfil; suspensa: boolean; emailMascarado: string; }
export interface AdminEscolaResumoDTO { id: number; nome: string; cnpj: string; usuarioId: number; contaSuspensa: boolean; }
export interface AdminVinculoMotoristaEscolaDTO {
  id: number; escolaId: number; motoristaId: number; status: StatusVinculoEscola; criadoEm: string; atualizadoEm: string;
}
export interface AdminVinculoResponsavelDTO {
  dependenteId: number; responsavelId: number; status: string; categoria: string | null;
  responsavelCriador: boolean; vinculadoEm: string | null;
}
export interface AdminAuditoriaDTO {
  id: number; atorUsuarioId: number; acao: string; tipoAlvo: string; alvoId: number | null;
  resultado: string; motivo?: string | null; ocorridoEm: string;
}
export interface DependenteResponsavelCriadorPendenteDTO {
  dependenteId: number; dependenteNome: string;
  responsaveis: { id: number; nome: string; telefone?: string | null }[];
}
```

Ajustes nos tipos existentes:

- `UserRole`: incluir `'ADMIN'`.
- `ParadaViagemDTO`: garantir `id` (necessário para reordenar) e `tipoParada: 'MOTORISTA' | 'RESPONSAVEL' | 'ESCOLA'`.
- `EnderecoDependenteDTO`: `finalidade: 'EMBARQUE' | 'DESEMBARQUE' | 'AMBOS'`, `statusValidacao`, `ativo`.

> Conferir no Swagger (`/swagger-ui`) como o Jackson serializa `BigDecimal` (número) e `Page` (formato padrão do Spring Data) antes de fechar os tipos.

### 5.3 Endpoints (`src/services/api.ts`)

Acrescentar ao `API_ENDPOINTS` (sem remover os existentes):

```ts
  // Documentos do motorista
  documentosMotorista: (idMotorista: number) => `/Motorista/${idMotorista}/Documentos`,

  // Vínculo motorista–escola
  solicitarVinculoEscola: '/Motorista/Escolas/Vinculos',
  vinculosMotorista: '/Motorista/Vinculos',
  vinculosMotoristaPendentes: '/Motorista/Vinculos/Pendentes',
  historicoVinculoMotorista: (id: number) => `/Motorista/Vinculos/${id}/Historico`,
  acaoVinculoMotorista: (id: number, acao: 'Aceitar' | 'Recusar' | 'Encerrar') => `/Motorista/Vinculos/${id}/${acao}`,
  buscarMotoristaEscola: '/Escola/Vinculos/Motoristas/Buscar',
  vinculosEscola: '/Escola/Vinculos',
  vinculosEscolaPendentes: '/Escola/Vinculos/Pendentes',
  historicoVinculoEscola: (id: number) => `/Escola/Vinculos/${id}/Historico`,
  acaoVinculoEscola: (id: number, acao: 'Aprovar' | 'Recusar' | 'Suspender' | 'Reativar' | 'Encerrar') =>
    `/Escola/Vinculos/${id}/${acao}`,

  // Rede de responsáveis
  convitesDependente: (idDependente: number) => `/Responsavel/Dependente/${idDependente}/Convites`,
  convitesPendentes: '/Responsavel/Convites/Pendentes',
  responderConvite: (idConvite: number, acao: 'Aceitar' | 'Recusar') => `/Responsavel/Convites/${idConvite}/${acao}`,
  responsaveisDependente: (idDependente: number) => `/Responsavel/Dependente/${idDependente}/Responsaveis`,
  revogarResponsavel: (idDependente: number, idResponsavel: number) =>
    `/Responsavel/Dependente/${idDependente}/Responsaveis/${idResponsavel}`,

  // Planejamento e execução
  agendaMotorista: (idMotorista: number) => `/Viagem/Agenda/${idMotorista}`,
  prontidaoViagem: (idViagem: number) => `/Viagem/Prontidao/${idViagem}`,
  prepararViagemDia: (idViagem: number) => `/Viagem/PrepararViagemDia/${idViagem}`,
  reordenarParadas: (idViagemDia: number) => `/Viagem/ReordenarParadasViagemDia/${idViagemDia}`,
  historicoStatusViagemDia: (idViagemDia: number) => `/Viagem/HistoricoStatusViagemDia/${idViagemDia}`,
  historicoOrdemParadas: (idViagemDia: number) => `/Viagem/HistoricoOrdemParadas/${idViagemDia}`,

  // Localização
  consentimentoMotorista: '/Viagem/Localizacao/Consentimento/Motorista',
  consentimentoDependente: (idDependente: number) => `/Viagem/Localizacao/Consentimento/Dependente/${idDependente}`,
  consentimentoExecucao: (idViagemDia: number) => `/Viagem/Localizacao/Consentimento/Execucao/${idViagemDia}`,
  atualizarLocalizacao: '/Viagem/Localizacao',
  localizacaoAtual: (idViagemDia: number) => `/Viagem/Localizacao/Atual/${idViagemDia}`,
  historicoLocalizacao: (idViagemDia: number) => `/Viagem/Localizacao/Historico/${idViagemDia}`,

  // Offline
  sincronizarPresencasOffline: '/Viagem/SincronizarPresencasOffline',

  // ADMIN
  adminDocumentosPendentes: '/Admin/Documentos/Pendentes',
  adminRevisarDocumento: (id: number) => `/Admin/Documentos/${id}/Revisar`,
  adminCriadorPendentes: '/Admin/Dependentes/ResponsavelCriadorPendentes',
  adminAtribuirCriador: (idDependente: number) => `/Admin/Dependentes/${idDependente}/ResponsavelCriador`,
  adminUsuarios: '/Admin/Usuarios',
  adminEscolas: '/Admin/Escolas',
  adminVinculosMotoristaEscola: '/Admin/Vinculos/MotoristaEscola',
  adminVinculosResponsavel: '/Admin/Vinculos/ResponsavelDependente',
  adminAuditoria: '/Admin/Auditoria',
  adminSuspender: (idUsuario: number) => `/Admin/Usuarios/${idUsuario}/Suspender`,
  adminReativar: (idUsuario: number) => `/Admin/Usuarios/${idUsuario}/Reativar`,
```

Atenção: `/Motorista/Escolas/Vinculos` **não** é rota pública; `isPublic` usa comparação exata, então não há risco.

### 5.4 Services novos ou ampliados

Seguir o padrão existente (funções assíncronas que retornam `response.data`). Arquivos:

| Arquivo | Funções |
|---|---|
| `src/services/documentoService.ts` (novo) | `listar(idMotorista)`, `submeter(idMotorista, dto)` |
| `src/services/vinculoEscolaService.ts` (novo) | Motorista: `solicitar(cnpj)`, `listarMotorista()`, `pendentesMotorista()`, `historicoMotorista(id)`, `aceitar(id, motivo?)`, `recusar(id, motivo)`, `encerrarMotorista(id, motivo)`. Escola: `buscarMotorista({email}\|{cpf})`, `convidar(motoristaId)`, `listarEscola()`, `pendentesEscola()`, `historicoEscola(id)`, `aprovar`, `recusarEscola`, `suspender`, `reativar`, `encerrarEscola` |
| `src/services/redeResponsaveisService.ts` (novo) | `convidar(idDependente, email, categoria)`, `pendentes()`, `historicoConvites(idDependente)`, `responsaveis(idDependente)`, `aceitar(id)`, `recusar(id)`, `revogar(idDependente, idResponsavel)` |
| `src/services/viagemService.ts` (ampliar) | `agenda(idMotorista)`, `prontidao(idViagem)`, `prepararViagemDia(idViagem, data)`, `reordenarParadas(idViagemDia, idsParadas)`, `historicoStatus(idViagemDia)`, `historicoOrdem(idViagemDia)`, `historicoPresenca(idViagemDia)` (endpoint já mapeado, sem função) |
| `src/services/localizacaoService.ts` (novo) | `consentirMotorista(aceito)`, `consentirDependente(idDependente, aceito)`, `estadoConsentimento(idViagemDia)`, `enviarPosicao(dto)`, `posicaoAtual(idViagemDia)`, `historico(idViagemDia, inicio, fim, pagina, tamanho)` |
| `src/services/offlineQueue.ts` (novo) | fila local e sincronização (seção 5.6) |
| `src/services/adminService.ts` (novo) | todas as rotas `/Admin/*` |
| `src/services/responsavelService.ts` (ampliar) | `desativarEnderecoDependente(idDependente, idEndereco)` |

Exemplo de padrão (vínculo motorista–escola):

```ts
import { api, API_ENDPOINTS } from './api';
import { HistoricoVinculoEscolaDTO, MotoristaBuscaDTO, VinculoEscolaDTO } from '../types';

const corpoMotivo = (motivo?: string) => (motivo?.trim() ? { motivo: motivo.trim() } : {});

export const vinculoEscolaService = {
  solicitar: async (cnpj: string): Promise<VinculoEscolaDTO> =>
    (await api.post(API_ENDPOINTS.solicitarVinculoEscola, { cnpj })).data,

  listarMotorista: async (): Promise<VinculoEscolaDTO[]> =>
    (await api.get(API_ENDPOINTS.vinculosMotorista)).data,

  aceitar: async (id: number, motivo?: string): Promise<VinculoEscolaDTO> =>
    (await api.post(API_ENDPOINTS.acaoVinculoMotorista(id, 'Aceitar'), corpoMotivo(motivo))).data,

  buscarMotorista: async (filtro: { email: string } | { cpf: string }): Promise<MotoristaBuscaDTO[]> =>
    (await api.post(API_ENDPOINTS.buscarMotoristaEscola, filtro)).data,

  historicoEscola: async (id: number): Promise<HistoricoVinculoEscolaDTO[]> =>
    (await api.get(API_ENDPOINTS.historicoVinculoEscola(id))).data,
  // ... demais ações seguem o mesmo formato
};
```

### 5.5 Conectividade (`src/hooks/useConnectivity.ts` + contexto)

- Assinar `NetInfo.addEventListener` uma vez em um `ConnectivityProvider` (ou dentro do `AppProvider`).
- Expor `{ online: boolean, ultimaSincronizacao: Date | null, pendentes: number, sincronizando: boolean, sincronizar(): Promise<void> }`.
- Considerar offline quando `isConnected === false` **ou** `isInternetReachable === false`. Um erro de rede do axios (sem `response`) também deve marcar o estado como offline temporariamente.
- Componente `ConnectivityBanner` (novo, `src/components/ConnectivityBanner.tsx`) exibido no topo do `AppLayout`: "Sem conexão — X registros aguardando envio" ou "Última sincronização às HH:mm". Atende 8.1.1–8.1.4.

### 5.6 Fila offline de presença (`src/services/offlineQueue.ts`)

Regras do backend (decisão 11): só `ESPERANDO → EMBARCADO`, `ESPERANDO → FALTOU`, `EMBARCADO → DESEMBARCADO`; execução `EM_ANDAMENTO`; UUID v4 por evento; lote de até 100; não sobrescreve conflito.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { api, API_ENDPOINTS } from './api';
import { EventoPresencaOfflineDTO, ResultadoEventoPresencaDTO, StatusViagemPresenca } from '../types';

const KEY = (usuarioId: number) => `tioDaPerua.filaPresenca.${usuarioId}`;

export interface EventoFila extends EventoPresencaOfflineDTO {
  situacao: 'PENDENTE' | 'CONFLITO' | 'REJEITADO';
  mensagem?: string | null;
}

export const offlineQueue = {
  async listar(usuarioId: number): Promise<EventoFila[]> {
    try { return JSON.parse((await AsyncStorage.getItem(KEY(usuarioId))) || '[]'); } catch { return []; }
  },

  async enfileirar(usuarioId: number, idViagemDia: number, idDependente: number,
                   statusEsperado: StatusViagemPresenca, statusNovo: StatusViagemPresenca) {
    const fila = await offlineQueue.listar(usuarioId);
    fila.push({
      idEvento: Crypto.randomUUID(), idViagemDia, idDependente, statusEsperado, statusNovo,
      ocorridoEm: new Date().toISOString(), situacao: 'PENDENTE',
    });
    await AsyncStorage.setItem(KEY(usuarioId), JSON.stringify(fila));
  },

  /** Envia os pendentes em lotes de 100; remove APLICADO/DUPLICADO; mantém CONFLITO/REJEITADO para o usuário ver. */
  async sincronizar(usuarioId: number): Promise<ResultadoEventoPresencaDTO[]> {
    const fila = await offlineQueue.listar(usuarioId);
    const pendentes = fila.filter((e) => e.situacao === 'PENDENTE');
    const resultados: ResultadoEventoPresencaDTO[] = [];
    for (let i = 0; i < pendentes.length; i += 100) {
      const lote = pendentes.slice(i, i + 100).map(({ situacao, mensagem, ...e }) => e);
      const { data } = await api.post(API_ENDPOINTS.sincronizarPresencasOffline, { eventos: lote });
      resultados.push(...data.resultados);
    }
    const porId = new Map(resultados.map((r) => [r.idEvento, r]));
    const nova = fila.flatMap((e) => {
      const r = porId.get(e.idEvento);
      if (!r) return [e];
      if (r.resultado === 'APLICADO' || r.resultado === 'DUPLICADO') return [];
      return [{ ...e, situacao: r.resultado, mensagem: r.mensagem }];
    });
    await AsyncStorage.setItem(KEY(usuarioId), JSON.stringify(nova));
    return resultados;
  },

  async descartar(usuarioId: number, idEvento: string) { /* remove um item em CONFLITO/REJEITADO após o usuário ciente */ },
};
```

Integração:

- Em `DriverAttendanceScreen`/`DriverAttendanceDetailScreen`, ao confirmar presença: se online, chamar `viagemService.alterarStatusPresenca`; se a chamada falhar **sem `response`** (rede), ou se estiver offline, chamar `offlineQueue.enfileirar(...)` e atualizar a tela de forma otimista com indicador "salvo no aparelho".
- Mensagem obrigatória (8.2.5): **"Registro salvo neste aparelho. Ele será enviado quando a conexão voltar."** Nunca dizer "registrado" ou "enviado".
- Ao voltar a conexão (NetInfo) e ao abrir a tela de execução, chamar `sincronizar`. Mostrar conflitos com o `statusAtual` vindo do servidor e o botão "Entendi" (descartar) — não reenviar automaticamente um conflito (8.3.5).
- Para falhas de rede durante o envio, manter `PENDENTE` e oferecer "Tentar novamente" (8.3.7).
- Ações **bloqueadas offline** (decisão 11): iniciar, finalizar, cancelar, interromper, reordenar e enviar GPS. Desabilitar os botões com o texto "Disponível apenas com conexão".
- A fila é por usuário (chave inclui o ID). No logout, **não** apagar automaticamente: avisar se houver pendentes antes de sair ("Há X registros não enviados. Sair mesmo assim?").

### 5.7 Localização do motorista (`src/hooks/useDriverLocation.ts`)

```ts
// Esboço: ativo somente com execução EM_ANDAMENTO e consentimento válido.
export function useDriverLocation(idViagemDia: number | null, ativo: boolean) {
  // 1. Location.requestForegroundPermissionsAsync() → status
  // 2. Location.hasServicesEnabledAsync() → GPS ligado?
  // 3. Location.watchPositionAsync({ accuracy: Balanced, timeInterval: 15000, distanceInterval: 0 }, cb)
  // 4. cb: se passaram >= 15 s desde o último envio, PUT /Viagem/Localizacao com
  //    { idViagemDia, latitude, longitude, instanteDispositivo: new Date(coords.timestamp).toISOString() }
  // 5. Tratar respostas:
  //    409 "Aguarde 15 segundos" → ignorar silenciosamente
  //    409 "GPS suspenso" / "GPS indisponível: consentimento..." → parar e mostrar aviso
  //    503 → "Localização indisponível no servidor"; parar
  //    erro de rede → não enfileirar (GPS não vai para a fila offline); só atualizar o indicador
  // 6. cleanup: subscription.remove() ao desmontar, ao finalizar/interromper/cancelar
  // Retorna: { permissao, gpsLigado, ultimaPosicao, ultimoEnvio, erro, desatualizada }
}
```

- Não arredondar no cliente (o backend arredonda para 5 casas).
- `desatualizada` no aparelho: último envio aceito há mais de 45 s (mesma regra do backend).
- Encerrar a assinatura sempre que o status sair de `EM_ANDAMENTO` (7.1.9, 5.9.4, 5.10.6).

### 5.8 Componente de mapa (`src/components/TripMap.tsx` + `TripMap.web.tsx`)

- Nativo: `react-native-maps` com um `Marker` para a posição atual. Paradas só aparecem como marcadores se tiverem coordenadas (hoje não têm — D10); caso contrário, a lista de paradas fica abaixo do mapa.
- Web: cartão com latitude/longitude, horário e link para abrir no OpenStreetMap.
- Props: `posicao?: { latitude, longitude }`, `ultimaAtualizacao?: string`, `desatualizada?: boolean`, `mensagem?: string`.
- Sempre mostrar "Última atualização: HH:mm:ss" e, se `desatualizada`, o aviso "Localização desatualizada".

### 5.9 Perfil ADMIN na sessão

- `src/services/authService.ts`: incluir `'ADMIN'` em `AppRole`; em `carregarPerfil`, para `ADMIN`, **não** chamar API — montar o usuário a partir de `authSession.getPerfil()` (`{ id, usuarioId, nome, tipoPerfil }`).
- `src/navigation/index.ts`: `HOME_BY_ROLE.ADMIN = 'AdminMain'` e novas rotas (seção 6.10).
- `AppContext`: aceitar `userRole = 'ADMIN'`; não chamar `refreshUnreadCount` nem `pushService.registrar` para ADMIN (as rotas de notificação exigem MOTORISTA/RESPONSAVEL/ESCOLA em parte dos casos).
- `AppLayout`: novo conjunto de abas `admin`.

### 5.10 Componentes de UI reutilizáveis a criar

| Componente | Uso |
|---|---|
| `ReasonDialog` (`src/components/ReasonDialog.tsx`) | Modal com campo de motivo, contador de caracteres e limite (500 ou 1000), botão desabilitado quando obrigatório e vazio. Usar em cancelar/interromper viagem, recusar/suspender/encerrar vínculo, suspender usuário, recusar documento. |
| `StatusBadge` (ampliar o existente) | Mapas de rótulo/cor para `StatusDocumento`, `StatusVinculoEscola`, `StatusViagemDia`, `StatusViagemPresenca`, `StatusConviteResponsavel`, `StatusEventoSincronizacao`. Centralizar os rótulos em `src/utils/statusLabels.ts`. |
| `Timeline` (`src/components/Timeline.tsx`) | Lista cronológica para históricos de vínculo, de status da viagem, de ordem de paradas e de presença. |
| `PendingIssuesList` | Lista de bloqueios de prontidão com ação "Corrigir" que navega à tela certa (documentos, veículo, vínculo com escola, endereços). |
| `ConnectivityBanner` | Seção 5.5. |
| `TripMap` | Seção 5.8. |

Rótulos sugeridos (`statusLabels.ts`):

```ts
export const STATUS_VIAGEM_DIA: Record<string, string> = {
  PLANEJADA: 'Programada', EM_ANDAMENTO: 'Em andamento', FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada', INTERROMPIDA: 'Interrompida',
};
export const STATUS_PRESENCA: Record<string, string> = {
  ESPERANDO: 'Aguardando', EMBARCADO: 'Embarcado', DESEMBARCADO: 'Desembarcado', FALTOU: 'Ausente',
};
export const STATUS_VINCULO_ESCOLA: Record<string, string> = {
  PENDENTE_ESCOLA: 'Aguardando a escola', PENDENTE_MOTORISTA: 'Aguardando o motorista',
  ATIVO: 'Ativo', RECUSADO: 'Recusado', SUSPENSO: 'Suspenso', ENCERRADO: 'Encerrado',
};
export const STATUS_DOCUMENTO: Record<string, string> = {
  PENDENTE: 'Em análise', APROVADO: 'Aprovado', RECUSADO: 'Recusado', VENCIDO: 'Vencido',
};
```

O estado "pronta para iniciar" (5.1.7) não é um status do backend: derivar de `PLANEJADA` + `prontidao.pronta === true`.

---

## 6. Implementação por área da listagem

Legenda da coluna **Front hoje**: ✅ feito · 🟡 parcial · ❌ ausente · ⛔ bloqueado (sem suporte no backend ou decisão contrária, ver seção 4).

### 6.1 Acesso (1.1 e 1.2)

| Item | Front hoje | O que fazer |
|---|---|---|
| 1.1.1–1.1.3 | ✅ `LoginScreen` + `authService.entrar`; mensagem genérica | Conferir que o texto de erro do 401 é genérico ("E-mail ou senha inválidos") e que conta suspensa mostra a mensagem do backend sem detalhes técnicos. |
| 1.1.4 | ✅ refresh token no SecureStore + `restaurarSessao` | Nada. |
| 1.1.5 | 🟡 `HOME_BY_ROLE` sem ADMIN | Seção 5.9. |
| 1.1.6 | ✅ `authService.sair` | Acrescentar o aviso de eventos offline pendentes (5.6). |
| 1.1.7 | ✅ `SessionExpiryHandler` + interceptores | Nada. |
| 1.2.1–1.2.6 | ✅ `ForgotPassword*`, `ResetPassword` | Validar a nova senha com a política do backend (mín. 12 caracteres, máx. 72 bytes UTF-8) em `validators.ts`, se ainda não estiver. |

### 6.2 Motorista — cadastro, CNH, veículo (2.1, 2.2, 2.3)

**2.1 Cadastro** — ✅ em `RegisterScreen` (motorista). Ajustes:
- Idade mínima conforme D1.
- Após criar a conta (2.1.10), em vez de levar direto ao início, levar a um **passo "Dados profissionais"** que direciona para `DriverDocuments` e `DriverVehicle` (ou exibir um checklist no início do motorista enquanto houver pendências).

**2.2 CNH** — ❌. Criar `DriverDocumentsScreen` (rota `DriverDocuments`):
- Lista os três tipos (CNH, Vistoria, Licenciamento) com o documento mais recente de cada tipo (o que não tem `substituidoEm`) e o `StatusBadge` (2.2.8).
- Formulário por tipo:
  - **CNH:** `numero` (11 dígitos), `categoria` (seletor A, B, C, D, E, AB, AC, AD, AE — para transporte escolar o esperado é D; exibir aviso se diferente, sem bloquear, pois a regra é do backend/ADMIN), `dataValidade` (2.2.1–2.2.3).
  - **Vistoria:** `numero` (identificador do laudo), `dataRealizacao` (não futura), `dataValidade` (posterior à realização) — atende 2.3.7.
  - **Licenciamento:** `numero` = RENAVAM (11 dígitos), `dataValidade` — atende 2.3.9.
- Validação local (2.2.6) + alerta quando `dataValidade` já passou (2.2.7): "Documento vencido não poderá ser aprovado".
- `RECUSADO`: mostrar `motivoRecusa` e botão "Enviar correção" que reabre o formulário preenchido (2.2.9). `VENCIDO`: botão "Atualizar".
- Texto fixo (exigido pela listagem): "A análise confere os dados informados; não comprova por si só a autenticidade do documento."
- Vistoria/licenciamento sem veículo: desabilitar e mostrar "Cadastre um veículo primeiro".
- 2.2.4 e 2.2.5: ⛔ (D2, D3).

**2.3 Veículo** — 🟡 `DriverVehicleScreen` cadastra/edita placa, modelo, ano, capacidade, cor. Ajustes:
- 2.3.3 marca: ⛔ (D4). 2.3.6 foto: ⛔ (D2).
- 2.3.11: exibir a situação do veículo = situação combinada da vistoria e do licenciamento (link para `DriverDocuments`).
- 2.3.12: ao salvar edição, avisar antes: "Alterar os dados do veículo exige reenviar vistoria e licenciamento." (regra do backend).

### 6.3 Motorista — vínculo com escola (2.4)

❌ no front (a busca `/Motorista/Escolas` já existe e é usada só para nomear viagens). Criar `DriverSchoolsScreen` (rota `DriverSchools`) com três abas (`SegmentedControl`): **Vinculadas** (`ATIVO`, `SUSPENSO`), **Pendentes** (`PENDENTE_ESCOLA` enviados e `PENDENTE_MOTORISTA` recebidos), **Encerradas** (`RECUSADO`, `ENCERRADO`).

- 2.4.1–2.4.3: botão "Solicitar vínculo" → busca por nome/CNPJ (`motoristaService.buscarEscolas`, mín. 2 caracteres) → selecionar → confirmar → `vinculoEscolaService.solicitar(cnpj)`.
- 2.4.4/2.4.5/2.4.8: lista de pendentes com "Aguardando a escola".
- Convites recebidos da escola (`PENDENTE_MOTORISTA`): botões Aceitar (motivo opcional) e Recusar (motivo obrigatório via `ReasonDialog`).
- 2.4.6: notificações de vínculo chegam pela central (grupo `SOLICITACAO`) — ver 6.9. Se o backend não gerar notificação para esse vínculo (fase 5 indica que não gera), atualizar a lista ao focar a tela (`useFocusEffect`) e mostrar um contador na aba.
- 2.4.7: aba Vinculadas.
- 2.4.9: "Encerrar vínculo" em `ATIVO`/`SUSPENSO` com motivo obrigatório.
- Detalhe do vínculo: `Timeline` com `historicoMotorista(id)`.

### 6.4 Motorista — início e perfil (2.5, 2.6)

**2.5 `DriverMainScreen`** — 🟡. Reorganizar:
- 2.5.1: card "Próximas viagens" com os próximos itens de `viagemService.agenda(idMotorista)` (hoje e amanhã), mostrando período, data e status.
- Card "Pendências" quando `prontidao` de alguma viagem tiver bloqueios ou quando houver documento `RECUSADO`/`VENCIDO`/ausente.
- Atalhos (`ShortcutCard`): Minhas viagens (`DriverTrips`), Meu veículo (`DriverVehicle`), Minhas escolas (`DriverSchools`), Documentos (`DriverDocuments`), Notificações (`NotificationList`), Perfil (`DriverProfile`) — 2.5.2–2.5.6.
- Atualizar as abas do `AppLayout` do motorista: trocar "Vínculos" por um menu que dê acesso a "Alunos" (solicitações de transporte, existente) e "Escolas" (novo), ou incluir "Escolas" no início — evitar mais de 5 abas.

**2.6 Perfil** — 🟡 `ProfileScreen` cobre dados, edição, senha e saída. Acrescentar seções (somente leitura com link):
- 2.6.3/2.6.4: "Documentos" com o resumo de status e link para `DriverDocuments`.
- 2.6.5: "Veículo" com link para `DriverVehicle`.
- 2.6.6: "Escolas vinculadas" (contagem de `ATIVO`) com link para `DriverSchools`.
- 2.6.7: "Dependentes vinculados": usar `motoristaService.listarSolicitacoes` / `DriverStudentsScreen` (alunos com solicitação aceita) — link.

### 6.5 Responsável — cadastro, início, dependentes, endereços (3.1–3.4)

**3.1 Cadastro** — ✅ `RegisterScreen` (responsável) com CEP. 3.1.9 ⛔ (D6).

**3.2 `GuardianMainScreen`** — 🟡. Garantir:
- 3.2.1: lista curta de dependentes (de `currentUser.dependentes`).
- 3.2.2/3.2.4: para cada dependente, `responsavelService.monitorar(id)`; se `statusAtual` pertence a uma execução `EM_ANDAMENTO`, card "Viagem em andamento" com botão "Ver no mapa" → `GuardianMonitoring`.
- 3.2.3: próximas viagens — ⛔ parcialmente: não há endpoint de agenda para o responsável. Mostrar apenas a viagem do dia, quando existir no monitoramento.
- 3.2.5: atalho "Vínculos" com contador de solicitações pendentes **e** convites de outros responsáveis (`redeResponsaveisService.pendentes()`).
- 3.2.6/3.2.7: sino e perfil (já no layout).

**3.3 Dependente** — 🟡 `GuardianDependentFormScreen`/`GuardianDependentsScreen`.
- 3.3.1–3.3.3, 3.3.7–3.3.9: ✅ (nome, nascimento sem idade mínima e não futuro, escola, salvar, detalhe, editar com senha).
- 3.3.4/3.3.5: mover a captura de endereço para a gestão de endereços (6.5, 3.4) — no cadastro, depois de salvar, abrir direto "Adicionar endereço de embarque".
- 3.3.6: ⛔ (D5).
- 3.3.10: ✅ histórico (`HistoryScreen` com `historicoDependente`). Conferir filtro de período (`de`/`ate`).
- Criar uma **tela de detalhe do dependente** (`GuardianDependentDetailScreen`, rota `GuardianDependentDetail`) que reúna: dados, endereços (3.4), responsáveis (3.5), motoristas vinculados (3.6.8), histórico (3.3.10), ausências e consentimento de localização (seção 6.8).

**3.4 Endereços** — 🟡. Criar `GuardianDependentAddressesScreen` (rota `GuardianDependentAddresses`) ou seção no detalhe:
- 3.4.1: listar `listarEnderecosDependente` separando ativos e inativos; mostrar `finalidade` e selo "CEP não confirmado" quando `statusValidacao = PENDENTE`.
- 3.4.2–3.4.5: reutilizar `AddressForm` (já faz ViaCEP com fallback manual).
- 3.4.6: `RadioCardGroup` com Embarque / Desembarque / Ambos. Avisar que só pode existir **um endereço ativo por finalidade** e que "Ambos" ocupa as duas; tratar o 409 do backend com a mensagem dele.
- 3.4.7: editar (PUT) e **desativar** (`DELETE`, novo) com `ConfirmDialog`.
- 3.4.8: texto informativo "Viagens já realizadas mantêm o endereço usado na data" (o backend guarda snapshot; nada a fazer no front).

### 6.6 Responsável — outros responsáveis e motoristas (3.5, 3.6)

**3.5 Rede de responsáveis** — ❌. Criar `GuardianDependentGuardiansScreen` (rota `GuardianDependentGuardians`, parâmetro `dependenteId`):
- 3.5.1: `responsaveis(idDependente)` com nome, categoria, selo "Criador".
- 3.5.2/3.5.3: botão "Convidar responsável" (visível só se o usuário atual for o criador — comparar `responsavelId` do item `responsavelCriador` com `currentUser.id`) → e-mail + categoria (`PAI`, `MAE`, `RESPONSAVEL_LEGAL`, `OUTRO`). Explicar que o convidado precisa ter conta de responsável.
- 3.5.5: aba "Convites" com `historicoConvites(idDependente)` e status (expira em 7 dias — mostrar `expiraEm`).
- 3.5.4: convites **recebidos** aparecem em `GuardianInvitesScreen` (nova seção "Convites de responsáveis") com Aceitar/Recusar.
- 3.5.6: "Remover" (`revogar`) visível para quem convidou; tratar o 409 "Atribua outro responsável criador antes de revogar".

**3.6 Vínculo com motorista** — 🟡 `GuardianSearchDriverScreen`, `GuardianInvitesScreen`.
- 3.6.1–3.6.4: ✅ busca por nome/proximidade, seleção do aluno, pedido de vaga com confirmação de compartilhamento.
- 3.6.6: garantir os quatro estados visíveis (pendente, aprovado, recusado, encerrado) — o backend usa `PENDENTE`, `ACEITA`, `RECUSADA`, `EXPIRADA`, e o encerramento aparece em `SolicitacaoDTO`; mapear em `statusLabels.ts`.
- 3.6.7: notificações via central (6.9).
- 3.6.8: seção "Motoristas" na tela de detalhe do dependente, filtrando solicitações aceitas daquele dependente.
- 3.6.9: ✅ `encerrarVinculo`.

### 6.7 Responsável — acompanhamento (3.7) e mapa (7.2)

Ampliar `GuardianMonitoringScreen`:
- 3.7.1/7.2.1: seletor de dependente no topo (quando houver mais de um).
- 3.7.2/3.7.3/7.2.5: `monitorar(id)` → status da presença atual, horários de embarque/desembarque.
- 7.2.2: se não houver execução `EM_ANDAMENTO`, mostrar "Nenhuma viagem em andamento" e o último evento.
- 3.7.4/7.2.3/7.2.4: com execução ativa, polling de `localizacaoService.posicaoAtual(idViagemDia)` a cada 15 s **apenas com a tela em foco** (`useFocusEffect` + `AppState`), renderizando `TripMap`.
- 3.7.5/3.7.6/7.2.6: "Última localização às HH:mm:ss"; se `desatualizada` ou erro, aviso "Não foi possível atualizar a localização"; 404/409/503 → mensagem neutra ("Localização indisponível para esta viagem"), sem detalhes técnicos.
- 3.7.7: lista de eventos da viagem (`historicoRecente` do monitoramento) e atalho para a central filtrada pelo grupo `VIAGEM`.
- 3.7.8: ✅ aviso de ausência existente (`AbsenceModal`) — D16.
- Texto fixo (regra de segurança da listagem): "A posição no mapa não confirma embarque. O embarque é confirmado pelo motorista."

### 6.8 Consentimento de localização

Pré-requisito para 5.6.5 e 7.x. Sem ele o GPS não funciona (409).

- **Motorista:** em `DriverProfile` → "Privacidade e localização": interruptor que chama `consentirMotorista(true/false)`. Antes de iniciar uma viagem, se `estadoConsentimento(idViagemDia).motoristaConsentiu === false`, abrir um modal explicando a coleta (intervalo de 15 s, só durante a viagem, retenção de 7 dias, quem vê) com "Autorizar" / "Agora não". "Agora não" não impede iniciar a viagem — só desativa o GPS.
- **Responsável:** no detalhe do dependente → "Compartilhar localização do transporte" (`consentirDependente(id, aceito)`). Explicar que basta um responsável autorizar e que revogar suspende o GPS da viagem atual inteira.
- **Execução:** na tela de preparação/execução, mostrar o resultado de `estadoConsentimento`: "GPS ativo", "Aguardando autorização de responsáveis de N aluno(s)" (`dependentesPendentes`), ou "GPS suspenso nesta viagem" (`gpsSuspenso`).
- 503 (versão da política não configurada): mostrar "Localização desativada pelo servidor" e seguir sem GPS.

### 6.9 Escola (4.1–4.5)

**4.1 Cadastro** — 🟡 `RegisterScreen` (escola): nome, CNPJ com validação de dígitos, contatos, endereço, representante (`admResponsavel`), credenciais, termos. 4.1.7: o backend acusa CNPJ duplicado — exibir a mensagem dele. 4.1.9/4.1.10: ⛔ (D7); depois do cadastro, levar ao login com "Cadastro concluído".

**4.2 `SchoolMainScreen`** — ❌ (hoje só atalhos). Reescrever:
- 4.2.1: card "Motoristas vinculados" = contagem de `listarEscola()` com status `ATIVO` (e `SUSPENSO` separadamente).
- 4.2.2: card "Solicitações pendentes" = `pendentesEscola()` (status `PENDENTE_ESCOLA`), com atalho.
- 4.2.3: ⛔ não existe endpoint de viagens por escola; omitir ou mostrar texto "Em breve".
- 4.2.4: atalho para `NotificationList` e mostrar o sino também para a escola (hoje `showBell` é falso para `school` em `AppLayout`).
- 4.2.5: atalho para `SchoolProfile`.
- Abas da escola: Início, Motoristas (`SchoolDrivers`), Avisos, Perfil.

**4.3 e 4.4 Aprovação e gestão** — ❌. Criar:
- `SchoolDriversScreen` (rota `SchoolDrivers`) com abas **Pendentes** (`PENDENTE_ESCOLA` recebidos + `PENDENTE_MOTORISTA` enviados), **Ativos** (`ATIVO`, `SUSPENSO`), **Encerrados** (`RECUSADO`, `ENCERRADO`) — 4.3.1, 4.3.9, 4.4.1–4.4.4.
- Botão "Convidar motorista": busca por **e-mail ou CPF exato** (`buscarMotorista`) → lista `id`/`nome` → `convidar(motoristaId)`.
- `SchoolDriverLinkDetailScreen` (rota `SchoolDriverLinkDetail`, parâmetro `vinculoId`) — 4.3.2:
  - 4.3.3: nome do motorista (é o que o backend expõe).
  - 4.3.4/4.3.5: ⛔ parcial — não há endpoint para a escola consultar documentos/veículo do motorista. O backend recusa a aprovação se houver pendência documental e devolve a mensagem ("Não é possível aprovar o motorista. ..."); exibir essa mensagem. Registrar como pedido ao backend: endpoint de resumo documental para a escola.
  - 4.3.6: Aprovar (motivo opcional). 4.3.7: Recusar (motivo obrigatório).
  - 4.3.10: Suspender (motivo obrigatório), Reativar (opcional), Encerrar (obrigatório), habilitados conforme o status.
  - 4.3.8/4.4.6: `Timeline` com `historicoEscola(id)`, exibindo `perfilAtor`, motivo e data.

**4.5 Perfil** — 🟡 `ProfileScreen` (escola) já edita dados e contatos e troca senha. 4.5.4: ⛔ (D7).

### 6.10 Viagens e planejamento (5.1–5.10)

Conceitos do backend que a UI deve deixar claros:
- **Viagem (itinerário)**: período + escolas + alunos aceitos; criada uma vez (`CriarViagem`).
- **Execução do dia (`ViagemDia`)**: uma data daquela viagem; criada ao "preparar" (`PrepararViagemDia`) e só então tem paradas e presenças.

**5.1 Minhas viagens** — 🟡 `DriverTripsScreen` lista itinerários. Reestruturar:
- 5.1.2/5.1.3: `SegmentedControl` de período (Ida / Volta / Todos) e faixa horizontal com os 7 dias de `agenda` (hoje + 6).
- 5.1.4/5.1.7: para a data selecionada, listar os itens da agenda com status: sem execução → "Não preparada"; `PLANEJADA` + prontidão ok → "Pronta para iniciar"; `PLANEJADA` com bloqueios → "Com pendências"; demais estados pelos rótulos de 5.10.
- 5.1.5: "Nova viagem" → fluxo 5.2.
- 5.1.6: tocar no item → `DriverTripDetails` (itinerário) ou `DriverTripDay` (execução, se materializada).
- 5.1.8: o backend já impede duplicidade (uma viagem ativa por período; `PrepararViagemDia` é idempotente por data). No front, desabilitar "Nova viagem" para períodos já ocupados e tratar o 409 com a mensagem do backend.

**5.2 Criar viagem** — 🟡 (criação por período + escolas existe).
- 5.2.1: a data não faz parte da viagem; ela é escolhida ao preparar. Após criar, oferecer "Preparar para hoje".
- 5.2.3: ⛔ seletor (D9) — mostrar o veículo e a capacidade em leitura.
- 5.2.4/5.2.5: `DriverAvailableDependentsScreen` + `solicitarDependente` (o aluno entra após o responsável aceitar).
- 5.2.7: mostrar "N de C lugares" (alunos aceitos × `veiculoDTO.capacidade`) e bloquear novas solicitações quando cheio (o backend também bloqueia ao iniciar).
- 5.2.8: a viagem criada é a "programação"; não há rascunho no backend.

**5.3 Definir paradas** — 🟡 `DriverRouteViewScreen` mostra paradas geradas.
- 5.3.1–5.3.3: as paradas são geradas pelo backend a partir dos endereços de embarque/desembarque e das escolas, conforme ida/volta. Exibir por parada: tipo (motorista/aluno/escola), endereço, alunos.
- 5.3.4: ordenação manual (ver 5.4).
- 5.3.5/5.3.6: os bloqueios de prontidão já apontam "Dependente X não possui endereço..." e "CEP ... não está validado". Mostrar via `PendingIssuesList`; como o motorista não edita o endereço do aluno, a ação é "Avisar o responsável" (enviar notificação manual pelo `NotificationCreateScreen`, já existente).
- 5.3.7: confirmar a lista = "Confirmar rota" (5.4.10).

**5.4 Rota** — 🟡/⛔.
- 5.4.1–5.4.6: ⛔ (D8). Exibir aviso "Cálculo automático de rota indisponível nesta versão".
- 5.4.7/5.4.8: tela `DriverRouteOrderScreen` (rota `DriverRouteOrder`, parâmetro `viagemDiaId`) com setas ↑/↓ por parada (arrastar opcional; setas funcionam no web e com leitor de tela). Travar a primeira e a última parada (`tipoParada = 'MOTORISTA'`) e paradas concluídas.
- 5.4.9/5.4.10: "Salvar ordem" → `reordenarParadas(viagemDiaId, idsParadas)` com **todos** os IDs na nova ordem; atualizar a lista com a resposta.
- Histórico: `historicoOrdem(viagemDiaId)` em `Timeline` (aba "Alterações").

**5.5 Revisar e preparar** — ❌. Criar `DriverTripDayScreen` (rota `DriverTripDay`, parâmetros `{ viagemId, data, viagemDiaId? }`):
- Se não houver `viagemDiaId`: botão "Preparar viagem de dd/mm" → `prepararViagemDia(viagemId, data)` (só hoje até +6 dias).
- 5.5.1–5.5.3: resumo — alunos, paradas na ordem, capacidade.
- 5.5.4/5.5.5: `prontidao(viagemId)` → `PendingIssuesList` com `bloqueios`.
- 5.5.6: cada bloqueio tem ação de correção: documentos → `DriverDocuments`; veículo/capacidade → `DriverVehicle`; vínculo com escola → `DriverSchools`; endereço do aluno → avisar responsável.
- 5.5.7: "Confirmar planejamento" = salvar a ordem (5.4.10). O estado continua `PLANEJADA`.
- Opções: "Cancelar viagem do dia" (5.10).

**5.6 Iniciar** — 🟡 hoje `iniciarViagemDia` + `alterarStatusViagemDia`.
- 5.6.1/5.6.2: a partir de `DriverTripDay`.
- 5.6.3: `ConfirmDialog` "Iniciar viagem agora?" (bloqueado offline).
- 5.6.4/5.6.6/5.6.7: `alterarStatusViagemDia(id, 'EM_ANDAMENTO')`; o backend registra horário e notifica. Tratar "Execução bloqueada: ..." mostrando a lista de bloqueios.
- 5.6.5: verificar consentimento (6.8) e ativar `useDriverLocation`.
- 5.6.8: navegar para `DriverAttendance` (execução).

**5.7 Executar** — 🟡 `DriverAttendanceScreen` / `DriverAttendanceDetailScreen`.
- 5.7.1: `TripMap` no topo (colapsável) com a posição do motorista.
- 5.7.2: destacar a primeira parada com aluno ainda `ESPERANDO`/`EMBARCADO` pendente como "Próxima parada".
- 5.7.3: lista de alunos por parada (já existe).
- 5.7.4: ⛔ (D10).
- 5.7.5–5.7.7: ver seção 6.11.
- 5.7.8: aba "Eventos" com `historicoPresenca(viagemDiaId)` e `historicoStatus(viagemDiaId)`.
- 5.7.9: barra de progresso = (desembarcados + ausentes) / total.
- 5.7.10: `ConnectivityBanner` + lista de itens da fila em `CONFLITO`/`REJEITADO`.
- 5.7.11: botão "Finalizar viagem" (5.9).
- Existente e mantido: "Avisar atraso" (`avisarAtraso`, 5 a 180 min).

**5.8 Alterar rota durante a viagem** — 🟡/⛔.
- 5.8.1/5.8.3/5.8.4: botão "Alterar ordem" na execução → `DriverRouteOrder` com as paradas restantes; mostrar quantas paradas mudam de posição antes de salvar.
- 5.8.5: o backend registra no histórico.
- 5.8.2/5.8.6: ⛔ (D11). Opcional: depois de salvar, oferecer "Avisar responsáveis" usando a notificação manual existente, com o motivo digitado pelo motorista.

**5.9 Finalizar** — 🟡.
- 5.9.1: antes de confirmar, listar alunos ainda `ESPERANDO` ou `EMBARCADO`; com pendências, o botão fica desabilitado com "Registre desembarque ou ausência de todos os alunos".
- 5.9.2–5.9.6: `alterarStatusViagemDia(id, 'FINALIZADA')`; parar o GPS; o backend registra horário, notifica e apaga a posição corrente.
- Sincronizar a fila offline **antes** de finalizar; se houver pendentes, pedir conexão.
- 5.9.7/5.9.8: voltar a `DriverTrips` e invalidar o estado `activeViagemDia` no contexto.

**5.10 Cancelar ou interromper** — 🟡.
- 5.10.1/5.10.2: menu "Opções" na viagem do dia. Mostrar **Cancelar** apenas em `PLANEJADA` e **Interromper** apenas em `EM_ANDAMENTO` — essa é a distinção pedida pela listagem; explicar no próprio diálogo: "Cancelar: a viagem não vai acontecer" / "Interromper: a viagem começou e não será concluída".
- 5.10.3/5.10.4: `ReasonDialog` (obrigatório, máx. 1000).
- 5.10.5–5.10.8: `alterarStatusViagemDia(id, 'CANCELADA' | 'INTERROMPIDA', motivo)`; parar o GPS; o backend notifica e registra.

### 6.11 Embarque, desembarque e ausência (6.1–6.4)

`DriverAttendanceDetailScreen` como tela de parada:
- 6.1.1–6.1.3: endereço, alunos previstos e status atual de cada um (`StatusBadge`).
- 6.1.4: ⛔ parcial — `DependenteParadaDTO` traz `nomeDependente`, `nomeResponsavel`, `statusEmbarque`. Idade, escola e endereço podem vir de `DependenteAnonimoDTO`/`ViagemDetalhadaDTO`; telefone do responsável, alergia e deficiência não existem (D5). Mostrar só o que o backend entrega.
- 6.1.5: ⛔ (D10).
- 6.2/6.3/6.4: botões por aluno conforme o status atual — `ESPERANDO`: "Embarcou" e "Ausente"; `EMBARCADO`: "Desembarcou"; `DESEMBARCADO`/`FALTOU`: sem ações. Confirmar com `ConfirmDialog` (6.2.2, 6.3.2, 6.4.3).
- Horário e autor (6.2.3, 6.3.3, 6.4.4) são registrados pelo backend; mostrar o horário retornado/atualizado.
- Notificações (6.2.5, 6.3.5, 6.4.6) são geradas pelo backend.
- Offline: usar a fila (5.6) com `statusEsperado` = status atual exibido.

### 6.12 GPS do motorista (7.1) e histórico de localização (7.3)

- 7.1.1–7.1.9: `useDriverLocation` (5.7) + `TripMap` (5.8) na execução. Estados de erro com mensagens próprias:
  - permissão negada: "Permita o acesso à localização nas configurações do aparelho" + botão `Linking.openSettings()`;
  - GPS desligado: "Ative a localização do aparelho";
  - sem sinal / sem envio há mais de 45 s: "Localização desatualizada".
- 7.3.1/7.3.2/7.3.4/7.3.5: feitos no backend.
- 7.3.3: opcional — no histórico da viagem do motorista, aba "Trajeto" com `localizacaoService.historico` (somente até 7 dias atrás), listando os pontos. Não exibir para escola/ADMIN.

### 6.13 Offline e sincronização (8.1–8.3)

Implementado pela fundação (5.5 e 5.6). Lista de verificação:
- 8.1.1–8.1.4: `ConnectivityBanner` visível em todas as telas do motorista e indicador de pendentes no cabeçalho.
- 8.2.1: só presença; demais ações desabilitadas offline.
- 8.2.2–8.2.5: fila local com UUID, `idViagemDia`, `ocorridoEm` UTC, mensagem "salvo no aparelho".
- 8.3.1–8.3.7: sincronização automática ao reconectar e manual ("Sincronizar agora"); `DUPLICADO` tratado como sucesso; `CONFLITO`/`REJEITADO` mostrados com o status atual do servidor; nova tentativa para falhas de rede.

### 6.14 Notificações (9.1–9.3)

🟡 `NotificationListScreen` já lista lidas/não lidas com filtro por grupo, paginação, marcar como lida e marcar todas; push registrado.
- 9.1.4/9.1.5: confirmar que tocar na notificação abre a tela relacionada. Criar `src/utils/notificationRouting.ts` que, a partir de `tipo` e dos IDs presentes no `NotificacaoDTO`, decide o destino: `EMBARQUE`/`DESEMBARQUE`/`AUSENCIA`/`MOTORISTA_A_CAMINHO`/`VIAGEM_*` → `GuardianMonitoring` (responsável) ou `DriverAttendance` (motorista); `SOLICITACAO` → `GuardianInvites`/`DriverInvites`/`SchoolDrivers`; demais → detalhe. Usar o mesmo mapeamento no `PushNotificationsHandler` ao tocar no push.
- 9.2.1–9.2.7: tipos já gerados pelo backend; garantir ícone e rótulo para cada `TipoNotificacao`.
- 9.2.8/9.2.9: ⛔ como notificação (D15); tratar como banner local.
- 9.3.1–9.3.4: solicitações de transporte — geradas pelo backend (grupo `SOLICITACAO`).
- 9.3.5/9.3.6: vínculo escola — o backend não gera notificação (limite da fase 5). Mostrar contadores nas telas de vínculos; registrar pedido ao backend.
- Escola: habilitar o sino no `AppLayout` (hoje oculto para `school`).

### 6.15 Administrador (10.1–10.5)

❌. Recomenda-se uso pelo navegador (`npm run web`), mas as telas devem funcionar no celular. Telas novas (layout `AdminLayout` ou `AppLayout` com `role='admin'`):

| Rota | Tela | Itens | Endpoints |
|---|---|---|---|
| `AdminMain` | Painel | 10.1.3 — contagens: documentos pendentes, dependentes sem criador, atalhos | `adminDocumentosPendentes`, `adminCriadorPendentes` |
| `AdminDocuments` | Revisão de documentos | 10.4.2 (parcial), aprovar/recusar com motivo | `adminDocumentosPendentes`, `adminRevisarDocumento` |
| `AdminUsers` | Usuários | 10.2.1–10.2.5 — filtros por ID, perfil, e-mail exato, suspensa; resultados com e-mail mascarado; suspender (motivo obrigatório) / reativar | `adminUsuarios`, `adminSuspender`, `adminReativar` |
| `AdminSchools` | Escolas | 10.3.1, 10.3.3 (nome/CNPJ/conta suspensa), suspender a conta pelo `usuarioId` | `adminEscolas` |
| `AdminLinks` | Vínculos | 10.3.5, 10.4.1 — abas motorista–escola e responsável–dependente; atribuição de responsável criador | `adminVinculosMotoristaEscola`, `adminVinculosResponsavel`, `adminCriadorPendentes`, `adminAtribuirCriador` |
| `AdminAudit` | Auditoria | 10.5.1–10.5.4 — filtros por ator, ação, tipo de alvo, alvo, período; paginação | `adminAuditoria` |

- 10.1.1/10.1.2/10.1.5: login comum + seção 5.9; sair pelo menu.
- 10.1.4/10.5.5/10.5.6: feitos no backend (toda ação ADMIN é auditada; rotas restritas a `ADMIN`).
- 10.2.6: histórico por usuário = auditoria filtrada por `tipoAlvo`/`alvoId`.
- 10.2.7, 10.3.2, 10.3.4 (aprovar cadastro), 10.4.3/10.4.4: ⛔ (D7, D13). 10.4.5: motivo já obrigatório onde o backend exige.
- Tratar 409 de auto-suspensão e "último ADMIN ativo" com a mensagem do backend.
- Datas `Instant` nos filtros: enviar em ISO UTC (`new Date(...).toISOString()`).

### 6.16 Perfil, configurações e suporte (11.1–11.3)

- 11.1: ✅ `ProfileScreen`; acrescentar a seção de documentos para o motorista (6.4).
- 11.2: criar `SettingsScreen` (rota `Settings`, comum aos perfis), acessível pelo perfil:
  - 11.2.1: ⛔ preferências (D12); mostrar "Notificações no aparelho: ativadas/desativadas" com `Notifications.getPermissionsAsync()` e link para as configurações do sistema.
  - 11.2.2: permissões do app: notificações e localização (status + link `Linking.openSettings()`); para o motorista e o responsável, os consentimentos de localização (6.8).
  - 11.2.3: Termos e Política de Privacidade — abrir `TERMOS_PDF_URL` (já existe em `config.ts`) e informar versão vigente (`authService.termosVigente`) e prazos de retenção (GPS 7 dias, notificações 90 dias).
  - 11.2.4/11.2.5: ⛔ (D13).
  - Substituir o `PlaceholderScreen` de "Ajuda" (`DriverHelp`, `GuardianHelp`) por esta tela ou por um texto de ajuda simples.
- 11.3 — padrão para todas as telas novas:
  - 11.3.1: validar localmente com `validators.ts` e mostrar a mensagem do campo no `TextField`.
  - 11.3.2/11.3.3: erro sem `response` → mensagem de conexão e botão "Tentar novamente" (`StateView`).
  - 11.3.4: não limpar formulários em caso de erro; manter o estado local.
  - 11.3.5: toast de erro "Não foi possível concluir. Nada foi alterado." quando aplicável.
  - 11.3.6: nunca exibir stack, URL ou código interno; usar sempre `getApiErrorMessage`.

### 6.17 Regras transversais (12)

- 12.1.1–12.1.5: `masks.ts`/`validators.ts` já cobrem CPF, CNPJ, telefone, CEP e datas; acrescentar RENAVAM (11 dígitos), número de CNH (11 dígitos) e a política de senha do backend. Idade: D1.
- 12.2.2/12.2.3: o front não deve presumir permissão — esconder botão é só conveniência; tratar 403 com "Você não tem permissão para esta ação".
- 12.2.4: manter access token só em memória e refresh no SecureStore (já é assim). A fila offline guarda apenas IDs e status, sem nomes.
- 12.2.5: remover `console.log` com dados pessoais; manter só `console.warn` com mensagens genéricas.
- 12.3.1–12.3.6: aplicados no backend; o front reflete com bloqueios e mensagens (capacidade, prontidão, duplicidade, histórico).

---

## 7. Novas rotas (`RootStackParamList`)

```ts
  // Motorista
  DriverDocuments: undefined;
  DriverSchools: undefined;
  DriverSchoolLinkDetail: { vinculoId: number };
  DriverTripDay: { viagemId: number; data: string; viagemDiaId?: number | null };
  DriverRouteOrder: { viagemDiaId: number; emExecucao?: boolean };
  // Responsável
  GuardianDependentDetail: { dependenteId: number };
  GuardianDependentAddresses: { dependenteId: number };
  GuardianDependentGuardians: { dependenteId: number };
  // Escola
  SchoolDrivers: undefined;
  SchoolDriverLinkDetail: { vinculoId: number };
  // Comuns
  Settings: undefined;
  // ADMIN
  AdminMain: undefined;
  AdminDocuments: undefined;
  AdminUsers: undefined;
  AdminSchools: undefined;
  AdminLinks: undefined;
  AdminAudit: undefined;
```

Registrar cada uma em `App.tsx` e, quando for aba, em `AppLayout` (`PARENT_TAB` para manter a aba ativa nas telas filhas).

---

## 8. Plano de execução por fases

Cada fase deve terminar com o app abrindo sem erros no Android/iOS (Expo Go) e no web, `npx tsc --noEmit` sem erros e o roteiro de teste manual da fase executado contra o backend local.

| Fase | Entrega | Itens da listagem | Depende de |
|---|---|---|---|
| **F0 — Fundação** | Tipos (5.2), endpoints (5.3), services (5.4), `statusLabels`, `ReasonDialog`, `Timeline`, `PendingIssuesList`, StatusBadge ampliado | — | — |
| **F1 — Documentos e veículo** | `DriverDocumentsScreen`, ajustes no veículo e no cadastro, seção no perfil | 2.1.10, 2.2, 2.3, 2.6.3–2.6.5 | F0 |
| **F2 — Vínculo motorista–escola** | `DriverSchools*`, `SchoolMain` novo, `SchoolDrivers*`, sino da escola | 2.4, 2.6.6, 4.2, 4.3, 4.4 | F0 |
| **F3 — Dependente: endereços e rede** | `GuardianDependentDetail`, endereços com desativar, rede de responsáveis, convites recebidos | 3.3, 3.4, 3.5, 3.6.8 | F0 |
| **F4 — Planejamento** | Agenda de 7 dias, `DriverTripDay` (preparar, prontidão, pendências), `DriverRouteOrder`, cancelar | 5.1–5.5, 5.10 (cancelar) | F1, F2, F3 (bloqueios apontam para essas telas) |
| **F5 — Execução e presença** | Iniciar, tela de execução, parada, presença, finalizar, interromper, eventos, progresso, reordenar durante a viagem | 5.6–5.10, 6.1–6.4 | F4 |
| **F6 — Localização** | Dependências, consentimentos, `useDriverLocation`, `TripMap`, monitoramento do responsável com mapa | 3.7, 5.6.5, 5.7.1, 7.1, 7.2, 7.3.3 | F5 |
| **F7 — Offline** | NetInfo, `ConnectivityBanner`, fila de presença, sincronização, conflitos, aviso no logout | 5.7.10, 8.1–8.3 | F5 |
| **F8 — Notificações e início** | Roteamento de notificações e push, ajustes em `DriverMain`/`GuardianMain` | 2.5, 3.2, 9.1–9.3 | F2–F5 |
| **F9 — Administrador** | Sessão ADMIN, painel, documentos, usuários, escolas, vínculos, auditoria | 10.1–10.5 | F0 |
| **F10 — Configurações e acabamento** | `SettingsScreen`, substituição dos placeholders de ajuda, revisão de mensagens de erro e de logs | 11.2, 11.3, 12 | todas |

Ordem sugerida: F0 → F1 → F2 → F3 → F4 → F5 → F7 → F6 → F8 → F9 → F10. A F9 pode correr em paralelo a partir da F0, pois a revisão de documentos pelo ADMIN destrava os testes de "iniciar viagem" (a execução só inicia com CNH, vistoria e licenciamento aprovados).

---

## 9. Roteiro de teste manual (ponta a ponta)

Ambiente: backend local com `GPS_CONSENT_VERSION` definida e `ADMIN_EMAIL`/`ADMIN_PASSWORD` configurados.

1. Cadastrar escola, motorista e dois responsáveis.
2. Motorista: cadastrar veículo; enviar CNH, vistoria e licenciamento → status "Em análise".
3. ADMIN (web): aprovar os três documentos; recusar um documento de teste com motivo e verificar o motivo no app do motorista.
4. Motorista: solicitar vínculo com a escola; escola: aprovar. Testar também convite pela escola (busca por e-mail) e recusa com motivo; conferir os históricos.
5. Responsável A: cadastrar dependente, endereço de embarque (CEP válido) e de desembarque; convidar o responsável B (categoria MAE); B aceita; A tenta revogar a si mesmo → mensagem do backend.
6. Motorista: criar viagem de ida para a escola; solicitar o aluno; responsável aceita com compartilhamento.
7. Motorista: agenda → hoje → preparar; ver prontidão sem bloqueios; reordenar paradas; salvar.
8. Consentimentos: motorista autoriza; responsável A autoriza para o dependente.
9. Iniciar viagem; conferir notificação "viagem iniciada" no responsável; mapa do responsável com horário da última posição (celular físico, com GPS).
10. Colocar o celular do motorista em modo avião; registrar embarque → mensagem "salvo no aparelho"; reconectar → evento sincronizado e notificação de embarque no responsável.
11. Simular conflito: registrar offline em um aparelho e online em outro para o mesmo aluno → conflito exibido sem sobrescrever.
12. Responsável revoga o consentimento → motorista vê "GPS suspenso nesta viagem"; a presença continua funcionando.
13. Tentar finalizar com aluno embarcado → bloqueado; registrar desembarque → finalizar → GPS parado; histórico com horários.
14. Nova data: preparar e cancelar com motivo; outra data: iniciar e interromper com motivo; conferir notificações e histórico de status.
15. ADMIN: suspender o responsável B → B não consegue entrar nem renovar a sessão; reativar; conferir a auditoria filtrando por alvo.
16. Repetir as telas principais no navegador (`npm run web`), conferindo o fallback do mapa.

---

## 10. Pendências a levar ao backend

Itens da listagem que o front não consegue entregar sem mudança no backend:

1. Idade mínima do motorista: 18 (atual) × 21 (listagem) — D1.
2. Campos do dependente: observações operacionais, alergias, deficiência, e telefone do responsável na tela de parada — D5 / 6.1.4.
3. Marca do veículo — D4.
4. Status de aprovação do cadastro da escola e ação de aprovação pelo ADMIN — D7.
5. Endpoint para a escola consultar o resumo documental e o veículo do motorista ao analisar o vínculo — 4.3.4/4.3.5.
6. Notificações para eventos do vínculo motorista–escola — 9.3.5/9.3.6.
7. Agenda/próximas viagens do responsável — 3.2.3.
8. Viagens por escola — 4.2.3.
9. Motivo e notificação na reordenação durante a execução — 5.8.2/5.8.6.
10. Coordenadas das paradas (geocodificação) para mapa de paradas e aviso de proximidade — D10.
11. Preferências de notificação, pedido de correção de dados, encerramento de conta e denúncias — D12/D13.
12. Cálculo de rota (distância, duração, ETA) — D8, depende da escolha de provedor.

---

## 11. Registro de execução (11/11/2026)

Fases F0 a F10 implementadas seguindo o `guia_1111_otavio_padrao_visual_front.md`.

**Verificação feita:** `npx tsc --noEmit` sem erros; `npx expo export` gerou os bundles de web e Android sem erro.
**Não verificado:** chamadas reais ao backend (ele não estava rodando no momento), execução em aparelho físico (GPS, push, modo avião) e o roteiro de teste da seção 9.

**Dependências adicionadas** (`npx expo install`): `expo-location`, `react-native-maps`, `@react-native-community/netinfo`, `expo-crypto`. Plugin `expo-location` registrado no `app.json`.

| Fase | Arquivos principais |
|---|---|
| F0 — Fundação | `src/types.ts` (DTOs novos), `src/services/api.ts` (endpoints), `documentoService`, `vinculoEscolaService`, `redeResponsaveisService`, `localizacaoService`, `adminService`, `viagemService`/`responsavelService` ampliados, `utils/format.ts`, `utils/statusLabels.ts`, `utils/validators.ts` (RENAVAM, datas, motivo), `components/ReasonDialog`, `Timeline`, `Feedback` (Notice, PendingIssuesList, ProgressBar, InfoLine), `ChoiceChips`, `Pager` |
| F1 — Documentos e veículo | `DriverDocumentsScreen`; avisos no `DriverVehicleScreen`; resumo de documentos no `ProfileScreen` |
| F2 — Vínculo motorista–escola | `DriverSchoolsScreen`, `SchoolLinkDetailScreen` (usado pelos dois perfis), `SchoolDriversScreen`, `SchoolMainScreen` reescrita, `VinculoEscolaCard`; sino e aba "Motoristas" para a escola |
| F3 — Dependente | `GuardianDependentDetailScreen`, `GuardianDependentAddressesScreen` (desativar endereço), `GuardianDependentGuardiansScreen`; convites de responsáveis e aba "Encerrados" em `GuardianInvitesScreen` |
| F4 — Planejamento | Agenda de 7 dias em `DriverTripsScreen`; `DriverTripDayScreen` (preparar, prontidão com correção, consentimento, iniciar, cancelar); `DriverRouteOrderScreen`; lotação em `DriverTripDetailsScreen` |
| F5 — Execução e presença | `DriverAttendanceScreen` reescrita: topo fixo com mapa, próxima parada, progresso, confirmação de embarque/desembarque/ausência, finalizar com bloqueio de pendências, interromper/cancelar com motivo, eventos registrados, atraso |
| F6 — Localização | `hooks/useDriverLocation`, `components/TripMap` (+ `.web`), consentimentos (motorista, por aluno, por execução), `GuardianMonitoringScreen` reescrita com mapa ao vivo |
| F7 — Offline | `services/offlineQueue`, `context/ConnectivityContext`, `components/ConnectivityBanner`; aviso de pendências ao sair da conta |
| F8 — Notificações e início | `utils/notificationRouting` (central e push), `DriverMainScreen` e `GuardianMainScreen` ampliadas |
| F9 — Administrador | Sessão ADMIN em `authService`/`AppContext`/`HOME_BY_ROLE`; `AdminLayout`; `AdminMain`, `AdminDocuments`, `AdminUsers`, `AdminSchools`, `AdminLinks`, `AdminAudit` |
| F10 — Configurações | `SettingsScreen` (substitui os placeholders de Ajuda), `RoleLayout` |

**Decisões tomadas na implementação:**
- Idade mínima do motorista mantida em 18 no front, igual ao backend (D1 continua aberta).
- A pílula da aba ativa passou a usar `primary`, como no Figma.
- O backend não informa se o responsável/motorista já consentiu o GPS fora de uma execução; as chaves de consentimento começam desligadas e o estado real aparece na tela da viagem.
- `GuardianMonitoringScreen` deixou de registrar a resposta da API no console (dados do aluno), conforme 12.2.5.
- `DriverAttendanceDetailScreen` permanece registrada, mas não é mais usada pelo fluxo de execução.
- A validação de nascimento do dependente no formulário existente continua exigindo 1 ano ou mais; o backend não impõe mínimo (decisão 4).
