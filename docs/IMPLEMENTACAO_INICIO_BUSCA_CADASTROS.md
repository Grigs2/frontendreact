# Navegação inferior, telas iniciais, cadastros, buscas e solicitações

**Branch:** `feat/inicio-busca-cadastros` (criada a partir de `origin/homologacao`) · **Data:** 05–06/11/2026
**Situação:** implementado e testado no navegador com a API simulada. **Sem commit e sem push**, aguardando aprovação.
**Backend correspondente:** BackEndJava, branch `feat/busca-solicitacao-viagem-escola` (ver `Docs/IMPLEMENTACAO_BUSCA_SOLICITACAO_VIAGEM_ESCOLA.md` no repositório do backend).

---

## 1. Pedido

1. Tirar o menu lateral e navegar só pelos botões de baixo.
2. Melhorar a tela inicial de todos os perfis, com o print "Cards & Grids" como inspiração.
3. Melhorar o cadastro de dependente: data formatada, endereço estruturado, idade e validação de CPF.
4. Melhorar o cadastro do veículo.
5. O responsável encontra motoristas próximos ou pelo nome e pede vaga; o motorista procura alunos e convida (os dois sentidos).
6. A viagem é criada pela escola ("Viagem para <escola>") e pelo período (Manhã ida, Manhã volta etc., igual ao banco).
7. Aplicar o Design System dentro das telas.
8. Trabalhar a partir da `homologacao` e não subir nada sem aprovação.

## 2. Ponto de partida

A `homologacao` já tinha:
- autenticação JWT e cadastro em etapas (`25fcc9a`);
- menu inferior criado pelo Lucas, mantendo o lateral (`f69adef`);
- atualização para o Expo SDK 58 / React Native 0.88 (exige `npm install`);
- configuração do Codespace.

O termo de privacidade (`TermsModal`), que ainda não tinha commit, foi trazido para esta branch.

## 3. O que foi feito

### 3.1 Navegação sem menu lateral — `src/components/AppLayout.tsx`

- **Removido:** o menu lateral (drawer) e o botão de menu.
- **Cabeçalho:** logo + "Tio da Perua" e o sino de notificações (exceto para a escola, que tem a aba Avisos).
- **Abas:**

| Perfil | Abas |
|---|---|
| Motorista | Início, Rotas, Vínculos, Histórico, Perfil |
| Responsável | Início, Alunos, Motoristas, Vínculos, Perfil |
| Escola | Início, Avisos, Perfil |

- **Aba ativa nas telas internas:** `PARENT_TAB` define qual aba fica destacada (ex.: Chamada → Rotas; Veículo → Perfil).
- **Telas sem aba:** foram para **Perfil › Mais opções** (`ProfileScreen`), junto com **Sair da conta**. Motorista: Veículo, Notificações e Ajuda. Responsável: Histórico, Notificações, Planos e Ajuda.
- **Componente novo:** `ListRow`, uma linha de lista do Design System (`src/components/ui/ListRow.tsx`).

### 3.2 Telas iniciais — padrão "Cards & Grids"

- **Peças reutilizáveis:** `src/components/HomeBlocks.tsx`, com rolagem, saudação, título de seção, grade de 2 colunas e card de destaque com selo (chip).
- **Motorista (`DriverMainScreen`):**
  - card de destaque com a situação: "Em rota · Próxima parada: Ana" quando há viagem em andamento, a primeira viagem ativa, ou "Primeiros passos" (cadastrar veículo ou criar viagem);
  - alerta vermelho quando há pedidos de vaga;
  - atalhos com contagens: Rotas, Alunos, Vínculos, Histórico, Veículo (placa) e Avisos;
  - botão **Iniciar rota** (ou **Continuar chamada**).
- **Responsável (`GuardianMainScreen`):**
  - alerta de convites;
  - um card por aluno (idade, escola, "Com transporte" ou "Sem transporte") com **Acompanhar viagem** ou **Encontrar motorista**;
  - atalhos: Alunos, Motoristas, Vínculos e Histórico.
- **Escola (`SchoolMainScreen`):** card informativo, atalhos e os dados da instituição.

### 3.3 Cadastro de aluno — `GuardianDependentFormScreen`

- **Campos e validações:**
  - nome com sobrenome;
  - CPF com máscara e dígito verificador (não editável na edição);
  - nascimento `DD/MM/AAAA`, que recusa data impossível ou futura e idade fora de 1 a 25 anos;
  - **campo Idade** calculado na hora;
  - escola (lista com busca);
  - período (Manhã, Tarde ou Noite);
  - **endereço por CEP** (`AddressForm` + ViaCEP).
- **Ao salvar:**
  1. cadastra ou edita o aluno (a edição pede a senha, regra da API);
  2. vincula a escola;
  3. grava o **endereço estruturado** (`POST/PUT /Responsavel/Dependente/{id}/Enderecos`, finalidade `AMBOS`), usado nas paradas e na busca por proximidade.
- **Lista de alunos (`GuardianDependentsScreen`):** iniciais, idade, período, escola, situação do transporte, Editar e Acompanhar ou Achar motorista.
- **Novos utilitários:** `validateDependentBirthDate` e `ageLabel` em `src/utils/validators.ts`.

### 3.4 Cadastro do veículo — `DriverVehicleScreen`

- **Resumo** do veículo (modelo, cor, ano, placa e lugares), com o botão Editar.
- **Formulário com validação:**
  - placa antiga ou Mercosul, com máscara (`maskPlate`);
  - ano entre 1980 e o ano seguinte ao atual;
  - lugares entre 1 e 60;
  - cor.
- **Ao salvar:** cria com `POST /Motorista/CadastrarVeiculo/{id}` ou atualiza com `PUT /Motorista/{id}/Veiculo`.

### 3.5 Viagens por escola e período — `DriverTripsScreen`

- **"Nova viagem"** em dois passos:
  1. **escola** (busca na API, mínimo de 2 letras);
  2. **período**: Manhã/Tarde/Noite × ida/volta. Períodos que já têm viagem ativa aparecem bloqueados.
- **Prévia:** "Viagem para <escola> · Manhã · ida".
- **Sem veículo:** a tela mostra um alerta com o atalho para cadastrar o veículo.
- **Nomes e rótulos:** `viagemNome` e `periodoLabel` (em `viagemService.ts`) passaram a ser usados em todas as telas que mostravam o período cru (`MANHA IDA`): Detalhes, Histórico, Alunos e Monitoramento.

### 3.6 Buscas e solicitações nos dois sentidos

| Tela | O que faz |
|---|---|
| `GuardianSearchDriverScreen` (aba **Motoristas**) | Escolhe o aluno; busca **Próximos** (mesmo bairro ou cidade do endereço do aluno) ou **Por nome**; mostra veículo, local de atuação, selo de proximidade e as viagens; **Pedir vaga** (bloqueado quando a viagem vai para outra escola). Antes, a tela usava motoristas fictícios fixos no código |
| `GuardianInvitesScreen` (aba **Vínculos**) | Abas Convites (o motorista convidou: aceitar ou recusar), Pedidos (aguardando o motorista) e Ativos (encerrar transporte) |
| `DriverSearchStudentsScreen` | Escolhe a viagem e busca alunos por nome; **Convidar**. Antes criava uma viagem a cada escolha de período |
| `DriverAvailableDependentsScreen` | Mesmo componente (`StudentInviteList`), fixo na viagem aberta |
| `DriverInvitesScreen` (aba **Vínculos**) | Pedidos de vaga recebidos (aceitar ou recusar) e convites enviados. Antes era fictício e salvava no armazenamento local |

### 3.7 Chamada — `DriverAttendanceScreen`

- **Resumo:** embarcados, aguardando, desembarcados e faltas.
- **Botões por situação da viagem:**
  - Planejada: Iniciar viagem ou Cancelar;
  - Em rota: Finalizar ou Interromper.
  - **Cancelar e interromper pedem o motivo**, que a API exige. Antes sempre falhava.
- **Alerta "Atenção"** com os alunos da próxima parada que ainda não embarcaram, como no print.
- **Ações por aluno:** só as transições aceitas pela API:
  - Aguardando: Embarcou ou Faltou;
  - Embarcou: Desembarcou.

### 3.8 Serviços e tipos

- `types.ts`:
  - `ViagemDTO` ganhou `escolaId`, `escolaNome` e `nome`;
  - `SolicitacaoDTO` ganhou `origem`, `viagemNome`, `viagemPeriodo`, `motoristaId` e `responsavelNome`;
  - tipos novos: `EscolaBuscaDTO`, `MotoristaDisponivelDTO` e `EnderecoDependenteDTO`.
- `api.ts`: rotas novas (busca de escolas e motoristas, solicitações do motorista, pedido de vaga, endereços do aluno, atualização do veículo).
- `motoristaService`: `buscarEscolas`, `listarSolicitacoes`, `responderSolicitacao` e `atualizarVeiculo`.
- `responsavelService`: `buscarMotoristas`, `solicitarTransporte`, `listarEnderecosDependente`, `salvarEnderecoDependente` e `alterarDependente`.
- `viagemService`: `PERIODOS`, `periodoLabel`, `viagemNome`, `criar(..., escolaId)`, busca por nome nos alunos disponíveis e `motivo` ao alterar o status da viagem.

## 4. Bugs que já existiam e foram corrigidos

| Bug | Causa | Correção |
|---|---|---|
| Cadastrar dependente e cadastrar veículo falhavam com 401 | `isPublic` em `api.ts` usava "começa com": `/Responsavel/CadastrarDependente` era tratada como pública (`/Responsavel/Cadastrar`) e ia sem token. O erro estava no commit `25fcc9a` | Comparação exata do caminho |
| Depois de "Sair", o app entrava de novo sozinho | O login abria antes de apagar o refresh token e restaurava a sessão | `authService.sair()` limpa a sessão local antes e revoga no servidor sem esperar; o Perfil aguarda a limpeza |
| Criar viagem "Manhã · volta" dava erro | O banco não tinha `MANHA_VOLTA` | Período adicionado no backend (ver ressalva no item 7) |
| Cancelar a viagem do dia sempre falhava | A API exige motivo e o app não enviava | Campo de motivo |
| Detalhes da viagem mostravam toda viagem como "Inativa" | `ViagemDetalhadaDTO` não tinha `ativo` | Campo adicionado no backend |
| Aba Motoristas e Vínculos do motorista eram fictícias | Dados fixos no código | Ligadas à API |

## 5. Testes realizados

- `npx tsc --noEmit`: sem erros.
- **Navegador (Expo Web, 375 px):** API simulada no navegador com o contrato novo; ViaCEP real.
  - **Responsável:**
    - tela inicial;
    - busca por proximidade, que ordenou mesmo bairro → mesma cidade e excluiu outra cidade;
    - busca por nome;
    - "Pedir vaga" bloqueado para outra escola;
    - pedido enviado (`POST /Responsavel/SolicitarTransporte` 201);
    - Vínculos "Pedidos (1)";
    - cadastro de aluno: erros em todos os campos, máscaras, idade "9 anos", CEP preenchido; cadastro → vínculo da escola → endereço estruturado (201);
    - logout.
  - **Motorista:**
    - tela inicial com o alerta "2 pedidos de vaga";
    - aceite do pedido (`POST /Motorista/Solicitacoes/{id}/Responder`);
    - nova viagem com escola e período (`{"periodo":"TARDE_IDA","escolaId":2}`), com o período já usado bloqueado.
  - **Leitor de tela:** rótulos dos botões "Pedir vaga" foram diferenciados pelo motorista.
- **Não testado:**
  - fluxo completo da chamada (embarque e desembarque) e convite de aluno pelo motorista: o painel do navegador estava oculto, o que trava as animações dos modais;
  - backend real (o PostgreSQL local não aceitou a senha do arquivo de configuração);
  - aparelho Android/iOS.

## 6. Como testar

1. `npm install` (Expo SDK 58).
2. Backend da branch `feat/busca-solicitacao-viagem-escola` rodando com PostgreSQL.
3. `EXPO_PUBLIC_API_URL=http://localhost:<porta>/TioDaPerua/api` em `.env.local`.
4. `npx expo start --web`.

## 7. Pendências e observações

1. **Restrição antiga do banco:** em bancos já existentes, a coluna `viagem.periodo` pode ter uma restrição antiga (`viagem_periodo_check`) que não aceita `MANHA_VOLTA`, e o `ddl-auto=update` não a atualiza. Correção: `ALTER TABLE public.viagem DROP CONSTRAINT IF EXISTS viagem_periodo_check;`. Proposto incluir isso no backend para rodar sozinho, aguardando aprovação.
2. **Proximidade:** compara bairro e cidade do endereço, não usa GPS.
3. **Viagens antigas:** sem escola, aparecem com o nome do período e aceitam alunos de qualquer escola.
4. **Fora do Design System:** `DriverRouteViewScreen` (não está em nenhuma rota) e `DriverAttendanceDetailScreen` (só aberta por ela).
5. **Telas que ainda podem ser refinadas:** Monitoramento, Histórico do responsável (é um aviso "em implementação"), Notificações e Quadro de avisos. Ver `ESPECIFICACAO_VALIDACAO_NOTIFICACOES_HISTORICO.md`.
6. **Arquivo local:** `.claude/launch.json` ganhou a configuração `qa-stub` (servidor da API simulada). É local e não deve entrar no commit.
