# PLANO_TESTES_IMPLEMENTACAO_FRONT_E_BACK_END.md

## 1. Objetivo dos Testes
Validar a integração completa entre o FrontEnd e o BackEnd do projeto Tio da Perua, garantindo que as novas funcionalidades de gestão de viagens, monitoramento e alterações cadastrais estejam funcionando conforme o guia de implementação V1.

## 2. Pré-requisitos
- BackEnd Java (V3) em execução e acessível.
- FrontEnd React Native configurado com o `BASE_URL` correto em `src/services/api.ts`.
- Usuários de teste cadastrados para os perfis: Motorista, Responsável e Escola.

## 3. Casos de Teste por Perfil

### 3.1 Motorista (Driver)

| ID | Cenário | Passos | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| DRV-01 | Criar Nova Viagem | 1. Acessar Roteiro. 2. Clicar em Nova. 3. Selecionar Período. 4. Confirmar. | Viagem criada e exibida na lista de viagens ativas. |
| DRV-02 | Visualizar Detalhes | 1. Clicar em uma viagem da lista. | Exibe período, lista de alunos e botões de ação. |
| DRV-03 | Solicitar Vínculo | 1. Detalhes da Viagem -> Adicionar. 2. Clicar em "+" em um aluno. | Solicitação enviada ao BackEnd e exibida como pendente para o responsável. |
| DRV-04 | Iniciar Viagem do Dia | 1. Detalhes da Viagem -> Iniciar Viagem do Dia. | Navega para a tela de Chamada com a timeline de paradas. |
| DRV-05 | Controle de Chamada | 1. Tela de Chamada -> Clicar em Chamada. 2. Marcar Embarque/Desembarque. | Status atualizado em tempo real e visível para o responsável. |
| DRV-06 | Finalizar Rota | 1. Tela de Chamada -> Finalizar Rota. | Viagem do dia encerrada. |
| DRV-07 | Desativar Viagem | 1. Detalhes da Viagem -> Desativar. 2. Confirmar no modal vermelho. | Exibe notificação de sucesso, redireciona para "Minhas Viagens" e atualiza a lista. |
| DRV-08 | Sidebar Chamada | 1. Abrir Menu Lateral. 2. Clicar em Chamada. | Se houver viagem ativa, abre a tela de Chamada; se não, redireciona para Minhas Viagens com aviso. |
| DRV-09 | Alterar Status Viagem | 1. Tela Chamada -> Clicar no Status. 2. Escolher NOVO STATUS. 3. Confirmar. | Status atualizado no cabeçalho e notificação de sucesso exibida. |
| DRV-10 | Bloqueio de Chamada | 1. Alterar status viagem para FINALIZADA. | Botões de embarque/desembarque devem desaparecer ou ficar desabilitados. |

### 3.2 Responsável (Guardian)

| ID | Cenário | Passos | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| GUA-01 | Editar Dependente | 1. Dependentes -> Editar. 2. Alterar dados. 3. Confirmar com senha. | Dados atualizados no BackEnd e notificação de sucesso. |
| GUA-02 | Monitoramento em Tempo Real | 1. Monitoramento. 2. Selecionar Dependente. | Exibe status (Embarcado/etc) e dados do motorista/veículo se houver viagem ativa. |
| GUA-03 | Aceitar/Recusar Convite | 1. Convites -> Aba Convites. 2. Aceitar/Recusar. | Vínculo estabelecido (se aceito); motorista aparece em "Vínculos Ativos"; notificação de sucesso. |
| GUA-04 | Vínculos Ativos Detalhes | 1. Convites -> Aba Vínculos Ativos. | Deve exibir: Nome Motorista, Telefone, Aluno, Escola, Período, Data Início e Status (Badge). |
| GUA-05 | Encerrar Vínculo | 1. Convites -> Aba Vínculos Ativos. 2. Clicar em Encerrar Vínculo. 3. Confirmar. | Vínculo removido, notificação de sucesso e lista atualizada. |
| GUA-06 | Cadastro com Senha | 1. Meu Cadastro -> Alterar dados. 2. Salvar. 3. Confirmar com senha. | Dados salvos somente após validação da senha atual; notificação de sucesso. |
| GUA-07 | Cadastro Redirecionamento | 1. Registrar novo usuário. 2. Sucesso. | Notificação de sucesso exibida, redireciona para Login e limpa formulário. |

### 3.3 Escola (School)

| ID | Cenário | Passos | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| SCH-01 | Sidebar Simplificada | 1. Login como Escola. 2. Abrir Menu Lateral. | Somente as opções "Home" e "Sair" devem estar visíveis. |
| SCH-02 | Alteração Cadastral | 1. Meu Cadastro -> Alterar. 2. Confirmar com senha. | Dados da escola atualizados no BackEnd. |

## 4. Testes de Integração e UX

| ID | Cenário | Descrição |
| :--- | :--- | :--- |
| INT-01 | Fluxo de Erro (Senha) | Tentar alterar dados com senha incorreta. Deve exibir notificação de erro. |
| INT-02 | Estado de Carregamento | Verificar se o ActivityIndicator aparece durante todas as requisições à API. |
| INT-03 | Notificações Temporárias (Toast) | Verificar se as notificações aparecem no topo/base, com cores corretas e desaparecem após 4s. |
| WEB-01 | Responsividade Web | Redimensionar o navegador. O conteúdo deve se manter centralizado; Toast com largura máxima de 420px. |

## 5. Critérios de Aceitação
- [ ] Todas as novas telas (Viagens, Detalhes, Dependentes Disponíveis) acessíveis e funcionais.
- [ ] Integração com Endpoints V3 validada.
- [ ] Confirmação de senha funcional para todas as alterações cadastrais.
- [ ] Diálogos de confirmação visuais para operações destrutivas.
- [ ] Layout Web centralizado e responsivo.
- [ ] Sidebars atualizadas conforme a função do usuário.

## 6. Checklist Final
- [ ] Build do projeto sem erros de compilação.
- [ ] Typescript sem warnings de tipagem.
- [ ] Logout funcional redirecionando para a tela de Login.
## 7. Testes Específicos de Melhorias e Correções (V3.1)

| ID | Cenário | Passos | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| FIX-01 | Histórico do Motorista | 1. Sidebar -> Histórico. | Renderização correta; exibe data, período, status, passageiros e horários. |
| FIX-02 | Responsividade da Chamada | 1. Chamada -> Alterar status. 2. Repetir rapidamente. | A tela não deve travar; botões devem ser reabilitados após o loading. |
| FIX-03 | Embarque Tarde Volta | 1. Chamada (Período Tarde Volta) -> Embarcar Aluno. | Sucesso na atualização sem quebra de tela (sem tela branca). |
| IMP-01 | Monitoramento Detalhado | 1. Monitoramento -> Selecionar Aluno. | Exibe horários de embarque/desembarque e status da viagem atual. |
| IMP-02 | Período em Convites | 1. Convites -> Aba Convites. | Exibe o período da viagem no card (ex: MANHÃ IDA) via cache de API. |

