# Documentação de Engenharia de Software - Escopo Versão Beta (MVP)
**Projeto:** Tio da Perua – Sistema de Custódia e Gestão Logística Escolar  
**Versão:** 4.0 (Redução de Escopo / Modo Offline Homologado)

---

## 1. Diretrizes da Versão Beta
Para o estágio Beta (MVP), o escopo foi otimizado para focar no fluxo crítico de segurança e controle de presença. O sistema operará com **Mock Data (Dados Estáticos)** nas telas de visualização para simular com precisão a experiência de navegação e as regras de negócio sem dependência de conexões de rede ou erros de autenticação (401).

### Mudança Crítica de Fluxo:
O fluxo de solicitações foi invertido para se alinhar à API real: **O Motorista é o ator ativo** que busca os alunos cadastrados e solicita sua inserção na viagem. **O Responsável é o ator reativo** que recebe a notificação e homologa (aceita/recusa) o vínculo.

---

## 2. Regras de Negócio Ativas (Beta Reduzido)

### 2.1 Módulo de Vínculos e Cadastro
* **[RN001] Seleção Obrigatória de Escola:** Todo Dependente cadastrado no sistema pelo Responsável deve ser explicitamente vinculado a uma Escola previamente homologada no sistema através do envio dos identificadores `escola_id` e `dependente_id`.
* **[RN002] Fluxo de Ativação de Vínculo:** O Dependente só se tornará visível para a montagem de rotas e chamadas do Motorista após o seu respectivo Responsável aceitar a solicitação de entrada na viagem enviada pelo Motorista.
* **[RN003] Unicidade de Perfil:** O sistema impede que uma mesma credencial de usuário opere simultaneamente com os perfis de "Motorista" e "Responsável", visando integridade nas auditorias de custódia.
* **[RN004] Rescisão de Vínculo Autônoma:** O Responsável tem autonomia para encerrar o vínculo com o motorista atual a qualquer momento. Ao fazer isso, o dependente torna-se imediatamente visível (`disponível`) para captação por outros motoristas.

### 2.2 Módulo de Operação de Viagem e Rota
* **[RN005] Parametrização por Período:** Ao criar uma Viagem, o Motorista deve definir obrigatoriamente o período operacional correspondente (Ex: Matutino, Vespertino, Noturno).
* **[RN006] Snapshot Diário Automático:** O gatilho de "Iniciar Viagem do Dia" gera uma cópia imutável (Snapshot) da lista de nomes, endereços e ordenação das paradas calculadas para aquela data específica.
* **[RN007] Ponto de Partida Padrão:** Por definição de logística, a primeira parada (Origem/Parada 0) da Viagem do Dia será sempre a coordenada residencial do próprio Motorista.
* **[RN008] Sequenciamento Crescente:** A ordenação dos endereços dos Dependentes na lista de paradas (`BuscarParadasViagemDia`) deve seguir uma sequência numérica crescente e sucessiva baseada no roteiro otimizado.

### 2.3 Módulo de Presença e Custódia
* **[RN009] Trajetória de Estado Obrigatória:** Um dependente não pode transicionar para o status "Desembarcado" sem antes ter passado obrigatoriamente pelo status "Embarcado" na viagem ativa.
* **[RN010] Notificação de Presença:** A alteração do status de presença do aluno (Embarque/Desembarque) realizada pelo motorista dispara automaticamente um evento gravado no histórico e uma notificação na tela de avisos do Responsável em tempo real.
* **[RN011] Restrição de Telemetria:** O Responsável só terá acesso à tela de visualização de dados em tempo real da viagem enquanto a Viagem do Dia estiver com status `EM_ANDAMENTO` e o seu respectivo dependente estiver associado a ela.

---

## 3. Matriz de Arquitetura de Telas e Responsabilidades

### 🏫 Visão: Escola
1. **Login da Escola:** Autenticação restrita para gestores ou administradores de dados escolares.
2. **CRUD de Opções Escolares:** Tela dedicada para listar, cadastrar, atualizar ou remover escolas parceiras e seus respectivos endereços institucionais.

### 🏠 Visão: Responsável
1. **Cadastro/Edição de Dependente:** Formulário contendo dados do aluno e um campo de seleção (Dropdown) alimentado pelas escolas cadastradas no sistema.
2. **Central de Solicitações de Viagem:** Tela que exibe as notificações enviadas por motoristas interessados em levar o dependente. Contém dados da van (Placa/Modelo) e ações rápidas de `Aceitar` ou `Negar`.
3. **Visualizar Viagem Ativa:** Painel que monitora o status global da rota (`id_viagem`, `id_dependente`, `data_hora`, `status_viagem` [Planejado, Em Andamento, Finalizado, Cancelado]).
4. **Painel Viagem Presença:** Tela de histórico consolidado exibindo dias, horários e registros exatos de embarques e desembarques passados do aluno.

### 🚍 Visão: Motorista
1. **Cadastro de Veículo:** Registro dos dados do automóvel utilitário (Placa, Modelo, Capacidade) vinculados ao perfil do motorista.
2. **Criar Viagem:** Painel para abertura de uma nova viagem definindo o período. Gera o `id_viagem` utilizado como base de dados.
3. **Buscar Dependentes Disponíveis:** Tela de captação que consulta dependentes vinculados à escola do seu trajeto que estão sem transporte (`GET /Viagem/DependentesDisponiveis`), permitindo disparar a solicitação de vínculo.
4. **Controle de Trajeto (Timeline):** Tela operacional com a ordenação das paradas do dia. Permite gerenciar o status da rota e contém o botão de direcionamento para a tela exclusiva de presença.
5. **Tela de Chamada Dedicada (Separada da Timeline):** Interface limpa exibindo os alunos da parada atual. Permite alternar os status de presença de forma visual e intuitiva (Botões coloridos e destacados para Embarque, Desembarque e falta).

---

## 4. Especificação de Caso de Uso Crítico

### [CSU003] – Realizar Chamada Diária
* **Ator Principal:** Motorista
* **Objetivo:** Registrar com clareza a entrada e saída do dependente do veículo, assegurando a custódia do aluno e atualizando as informações de histórico e avisos para o responsável.
* **Pré-condições:** Viagem do dia iniciada e em execução ativa; Dependente presente no Snapshot logístico da rota.
* **Fluxo Principal:**
  1. O Motorista chega ao local estipulado e acessa a tela de Roteiro (Timeline).
  2. O Motorista aciona o botão "Realizar Chamada" associado ao card daquela parada.
  3. O sistema redireciona o usuário para a **Tela de Chamada Exclusiva**, exibindo apenas os alunos vinculados àquela parada.
  4. O Motorista clika no botão de ação correspondente (**Embarcar** [Destaque Verde] ou **Desembarcar** [Destaque Diferenciado]).
  5. (*Opcional para detalhes*) Ao clicar no nome do aluno, um Modal (Pop-up) é exibido com informações complementares (Endereço, Idade, Sexo).
  6. O sistema atualiza o estado visual do card do aluno e registra internamente o timestamp do evento.
  7. O sistema envia a atualização para a timeline de avisos do Responsável.
* **Pós-condições:** O status de presença do aluno é atualizado no modelo lógico e espelhado na tela de monitoramento do pai.