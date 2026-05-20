
# GUIA_IMPLEMENTACAO_FRONTEND_V1.md

## Objetivo

Este documento define as alterações necessárias no FrontEnd do projeto TioDaPerua para suportar as novas funcionalidades implementadas no BackEnd e corrigir problemas de usabilidade.

O documento será utilizado como guia de implementação pela IA Gemini CLI.

---

# Fontes de Verdade

A implementação deve seguir a seguinte ordem de prioridade:

1. API_DOCUMENTACAO_COMPLETA_V3.md Correspondente aos endpoints do BackEnd.
2. Código atual do FrontEnd.
3. Este documento.
4. GEMINI.md

Em caso de divergência, o BackEnd e a documentação da API prevalecem.

---

# Regras Gerais

## Arquitetura

Respeitar integralmente a arquitetura atual do projeto:

- `src/screens`
- `src/components`
- `src/services`
- `src/navigation`
- `src/context`
- `src/hooks`
- `src/types`
- `src/utils`

## Padrões obrigatórios

- Utilizar TypeScript.
- Reutilizar componentes existentes.
- Reutilizar estilos existentes.
- Não duplicar lógica.
- Não quebrar funcionalidades já operantes.
- Garantir compatibilidade com:
  - Android
  - Expo Go
  - Web
- Tratar:
  - loading
  - empty state
  - erros
- Utilizar `Alert` ou modal para confirmações.
- Usar tipagem forte para DTOs.
- Todas as chamadas devem utilizar `src/services/api.ts`.

## Responsividade

Todas as telas devem funcionar corretamente em:
- Mobile
- Tablet
- Web

---

# Alterações em Services

Atualizar os services existentes para incluir os novos endpoints.

## ViagemService

Adicionar:

- `listarViagens(idMotorista)`
- `criarViagem(idMotorista, payload)`
- `dependentesDisponiveis(idViagem)`
- `solicitarDependente(idViagem, idDependente)`
- `iniciarViagemDia(idViagem)`
- `buscarParadasViagemDia(idViagemDia)`
- `alterarStatusPresenca(payload)`
- `alterarStatusViagemDia(payload)`
- `desativarViagem(idViagem)`
- `historico(idMotorista)`
- `consultarMotorista(idViagemDia)`

## ResponsavelService

Adicionar:

- `listarSolicitacoes(idResponsavel)`
- `responderSolicitacao(idSolicitacao, payload)`
- `encerrarVinculoViagem(idSolicitacao)`
- `monitorar(idDependente)`
- `alterarInfos(payload)`

## DependenteService

Adicionar:

- `alterarInfos(payload)`

---

# Tipos e DTOs

Adicionar ou atualizar os tipos em `src/types`.

## Viagem

Incluir campo:

```ts
ativo: boolean;
````

## DependenteDTO

Incluir:

```ts
escola?: {
  id: number;
  nome: string;
};
```

## MotoristaViagemDTO

```ts
interface MotoristaViagemDTO {
  motoristaId: number;
  nomeMotorista: string;
  telefone: string;
  modeloVeiculo: string;
  placaVeiculo: string;
  corVeiculo: string;
}
```

---

# MOTORISTA

## Tela Lista de Viagens

### Objetivo

Listar viagens ativas do motorista.

### Endpoint

`GET /Viagem/ListarViagens/{id_motorista}`

### Funcionalidades

* Exibir lista de viagens.
* Botão “Nova Viagem”.
* Seleção de período para criação.

### Criar Viagem

Endpoint:
`POST /Viagem/CriarViagem/{id_motorista}`

### Navegação

Ao selecionar uma viagem:

* abrir Tela de Viagem Selecionada.

---

## Tela Viagem Selecionada

### Funcionalidades

* Exibir detalhes da viagem.
* Adicionar dependentes.
* Iniciar viagem.
* Desativar viagem.

### Endpoints

* `GET /Viagem/DependentesDisponiveis/{id_viagem}`
* `POST /Viagem/SolicitarDependente/{id_viagem}/{id_dependente}`
* `POST /Viagem/IniciarViagemDia/{id_viagem}`
* `PUT /Viagem/DesativarViagem/{id_viagem}`

### Regras

* Após solicitar dependente: recarregar tela.
* Após iniciar viagem: navegar para Lista de Endereços.
* Desativar viagem exige confirmação em modal vermelho.

---

## Tela Lista de Dependentes Disponíveis

### Objetivo

Permitir seleção de dependentes disponíveis para solicitação.

### Navegação

Após sucesso:

* retornar para Tela Viagem Selecionada.

---

## Tela Lista de Endereços (Chamada)

### Endpoint

`GET /Viagem/BuscarParadasViagemDia/{id_viagemDia}`

### Funcionalidades

Exibir:

* endereço;
* dependentes;
* status de presença;
* status da viagem.

Permitir:

* `PUT /Viagem/AlterarStatusPresenca`
* `PUT /Viagem/AlterarStatusViagemDia`

### Regra

Após cada alteração:

* recarregar dados.

Se status da viagem for `FINALIZADA`:

* impedir novas alterações;
* considerar viagem encerrada.

---

## Tela Histórico

### Endpoint

`GET /Viagem/Historico/{id_motorista}`

### Objetivo

Listar viagens inativas/finalizadas.

---

## Sidebar do Motorista

### Itens

* Home → Tela Inicial do Motorista
* Chamada → Lista de Endereços da viagem em andamento
* Roteiro → Lista de Viagens
* Avisos → `/Notificacao/Listar/{id_usuario}`
* Meu Cadastro → Detalhes do Motorista
* Meu Veículo → Tela do Veículo
* Histórico → Histórico de Viagens

### Remover

* Buscar Alunos
* Alunos

---

# RESPONSÁVEL

## Tela Inicial

### Ajuste

Padronizar dimensões dos botões na Web para ficar visualmente consistente com a Home do Motorista.

---

## Tela Lista de Dependentes

### Funcionalidades

* Listar dependentes vinculados.
* Exibir nome da escola.
* Editar dependente.

### Endpoint de alteração

`PUT /Dependente/AlterarInfos`

### Regra

Solicitar senha atual antes do envio.

---

## Tela Monitorar Dependentes

### Fluxo

1. Listar dependentes.
2. Selecionar dependente.
3. Chamar:
   `GET /Responsavel/Monitorar/{id_dependente}`
4. Se houver viagem ativa, chamar:
   `GET /Viagem/ConsultarMotorista/{id_viagemDia}`

### Exibir

* Viagem ativa.
* Histórico recente.
* Dados do motorista.
* Dados do veículo.

### Navegação

Adicionar botão de retorno rápido para a Lista de Dependentes.

---

## Tela Convites

### Endpoints

* `GET /Responsavel/ListarSolicitacoes/{id_responsavel}`
* `PUT /Responsavel/ResponderSolicitacao/{id_solicitacao}`
* `PUT /Responsavel/EncerrarVinculoViagem/{idSolicitacao}`

### Funcionalidades

* Aceitar.
* Recusar.
* Encerrar vínculo.

### Regras

Mostrar botão de encerrar vínculo apenas para solicitações aceitas.

---

## Tela Meu Cadastro

### Endpoint

`PUT /Responsavel/AlterarInfos`

### Regra

Solicitar senha atual antes do envio.

---

## Sidebar do Responsável

### Itens

* Home
* Monitoramento
* Convites
* Dependentes
* Planos
* Meu Cadastro

### Comportamento especial

Planos deve abrir uma tela com mensagem:
“Funcionalidade ainda não implementada.”

### Remover

* Histórico

---

# ESCOLA

## Sidebar da Escola

### Ajustes

* Home deve navegar para a tela inicial correta da Escola.
* Remover todos os itens, exceto:

  * Home
  * Sair

---

# COMPONENTES REUTILIZÁVEIS

Criar ou reutilizar:

* `ConfirmDialog`
* `PasswordConfirmationModal`
* `LoadingView`
* `EmptyState`
* `ErrorState`

---

# REGRAS DE UX

## Operações destrutivas

Sempre exigir confirmação visual destacada em vermelho.

## Alterações cadastrais

Sempre solicitar senha atual.

## Navegação

Após ações bem-sucedidas:

* atualizar tela automaticamente;
* redirecionar conforme fluxo.

---

# TESTES OBRIGATÓRIOS

## Motorista

* Listar viagens.
* Criar viagem.
* Solicitar dependente.
* Iniciar viagem.
* Alterar status.
* Finalizar viagem.
* Desativar viagem.
* Histórico.

## Responsável

* Listar dependentes com escola.
* Editar dependente.
* Monitorar dependente.
* Visualizar motorista.
* Convites.
* Encerrar vínculo.
* Editar cadastro.

## Escola

* Sidebar correta.

## Web

* Layout responsivo.
* Botões proporcionais.

---

# CRITÉRIOS DE ACEITAÇÃO

A implementação será considerada concluída quando:

1. Todas as telas funcionarem.
2. Todos os endpoints forem integrados.
3. Sidebars estiverem atualizadas.
4. Fluxos de navegação estiverem corretos.
5. Estados de loading/erro/vazio existirem.
6. Web estiver responsivo.
7. Nenhuma funcionalidade existente for quebrada.
