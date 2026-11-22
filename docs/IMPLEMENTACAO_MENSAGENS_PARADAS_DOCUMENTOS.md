# Mensagens rápidas, ordem das paradas e revisão de documentos (22/11/2026)

Branch `feat/mensagens-paradas-documentos` nos dois repositórios, criada a partir da `homologacao` atualizada: redesenho do responsável, horário de partida e mapa em tela cheia. A parte do backend está em `BackEndJava/Docs/IMPLEMENTACAO_MENSAGENS_PARADAS_DOCUMENTOS.md`.

## 1. Mensagens rápidas (motorista e responsável)

Mensagens prontas, enviadas com um toque, como "Vou atrasar" e "Estou na porta da sua casa". Usam a mensagem manual que já existia (`POST /Notificacao/Enviar`, tipo `MANUAL`).

**Motorista.** No atendimento, o botão **Mensagem** do aluno abre a janela de mensagens rápidas para o responsável dele:

| Situação | Sugestões |
|---|---|
| Com previsão de chegada da rota | "Chego em cerca de 7 min." |
| Ida (busca em casa) | "Estou na porta da sua casa para buscar Ana.", "Estou chegando. Pode preparar Ana para sair." |
| Volta (entrega em casa) | "Estou chegando com Ana.", "Estou na porta da sua casa com Ana." |
| Sempre | "Vou atrasar alguns minutos. Já estou a caminho.", "O trânsito está lento, mas já estou a caminho." |

**Responsável.** No acompanhamento, o cartão do motorista ganhou o botão **Mensagem ao motorista**, com estas sugestões: "Já estamos descendo.", "Aguarde só um minutinho, por favor.", "Vamos atrasar alguns minutos.", "Estou esperando no portão." e "Obrigado!".

**Nas duas telas:**
- **Escrever outra mensagem** abre o formulário completo.
- O formulário de nova mensagem também mostra as sugestões do perfil. Tocar numa sugestão preenche o título e o texto, que continuam editáveis.

**Privacidade:** as mensagens usam só o primeiro nome do aluno e não têm endereço (RN014).

Arquivos:
- `src/utils/mensagensRapidas.ts` (novo)
- `src/components/MensagensRapidasModal.tsx` (novo)
- `DriverAttendanceScreen.tsx`
- `GuardianMonitoringScreen.tsx`
- `NotificationCreateScreen.tsx`
- `types.ts`: `MotoristaViagemDTO.motoristaUsuarioId`, para o responsável conseguir mandar mensagem.

## 2. Ordem das paradas: desembarque na escola

**Regra:** cada aluno precisa **embarcar antes de desembarcar**.

| O motorista coloca… | Resultado |
|---|---|
| O desembarque na escola antes do embarque de **parte** dos alunos dela | Pode salvar. Os alunos que ainda não embarcaram vão para um **novo desembarque nessa escola, no fim da rota e antes da casa do motorista**. Se já existe um desembarque dessa escola depois do embarque deles, ele é reaproveitado. |
| O desembarque na escola antes do embarque de **todos** os alunos dela | Não pode salvar: "O desembarque na escola precisa vir depois do embarque de pelo menos um aluno dessa escola." |
| Na volta, a entrega em casa antes do embarque na escola | Não pode salvar: "A entrega de Ana não pode vir antes do embarque na escola." |

Alunos que faltaram ou já desembarcaram não contam.

**Antes de salvar,** a tela de ordem das paradas mostra o aviso ("Enzo ainda não embarcou quando a perua passa na EMEF… Ao salvar, será criado um novo desembarque…") ou o erro, e nesse caso desativa **Salvar ordem**. O servidor aplica a mesma regra (`ViagemService.separarDesembarquesAntecipados`).

**Histórico:** a criação do desembarque extra aparece como "novo desembarque criado na posição N".

Arquivos: `src/utils/paradas.ts` (`analisarOrdem`) e `DriverRouteOrderScreen.tsx`.

## 3. Documentos do motorista: revisão do administrador

A tela **Documentos** do administrador foi refeita para agilizar a revisão.
- Os documentos aparecem **agrupados por motorista**, com o nome, a idade e o veículo (modelo e placa).
- Cada documento traz **conferências automáticas** (`GET /Admin/Documentos/Revisao`):

| Documento | Conferências |
|---|---|
| CNH | Dígitos verificadores do número. Número igual ao do cadastro. Categoria D ou E (CTB, art. 138). Mais de 21 anos. Validade. |
| Vistoria | Feita há no máximo 6 meses (vistoria semestral, CTB, art. 136). É do veículo atual. Validade. |
| Licenciamento (CRLV) | Dígito verificador do RENAVAM. É do veículo atual. Validade. |

- **Situações:**
  - verde: ok;
  - amarelo: o administrador precisa conferir no documento;
  - vermelho: impede aprovar. Só documento vencido ou sem validade fica vermelho, como já era.
- **Aprovar todos de uma vez:** o botão **Aprovar N documentos de Fulano** aprova de uma vez todos os documentos do motorista que podem ser aprovados. A confirmação diz quantos pontos ainda pedem conferência.
- **Motorista:** no cadastro de documentos, se os dígitos finais da CNH ou do RENAVAM não conferem, aparece o aviso "confira o número no documento". O aviso não bloqueia o envio.

Por que os dígitos só **avisam**, sem bloquear:
- os números de teste da seed não passam nesse cálculo;
- dígito verificador certo não prova que o documento existe. A consulta oficial (Senatran) precisa do login gov.br do próprio motorista.

Arquivos:
- `AdminDocumentsScreen.tsx` (refeita)
- `DriverDocumentsScreen.tsx`
- `src/utils/validators.ts` (`cnhDigitosConferem`, `renavamDigitoConfere`)
- `src/services/adminService.ts` (`documentosParaRevisao`)
- `api.ts`
- `types.ts`

## Como foi testado

- `npx tsc --noEmit -p .` sem erros.
- Navegador (Expo web), com a API simulada:
  - **Motorista:** a janela de mensagens mostrou "Chego em cerca de 7 min." usando a previsão da rota. O envio mandou título, texto, aluno e viagem para o responsável certo.
  - **Ordem das paradas:** com a escola antes do Enzo, apareceu o aviso do novo desembarque. Com a escola antes de todos, apareceu o erro e o salvar ficou desativado.
  - **Administrador:** documentos agrupados por motorista, com as conferências. A aprovação em lote enviou os 3 documentos. O documento vencido ficou com Aprovar desativado.
- **Não testado:**
  - a janela de mensagens do responsável (a API simulada não tem viagem ativa para o responsável);
  - o celular real;
  - o salvar da ordem contra o backend real.
