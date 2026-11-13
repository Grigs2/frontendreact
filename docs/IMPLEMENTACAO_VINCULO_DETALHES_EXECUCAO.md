# Início da viagem sem documentos, vínculo aceito que reaparecia e pop-up da outra parte (app)

**Branch:** `fix/vinculo-detalhes-execucao` (criada a partir de `homologacao`) · **Data:** 13/11/2026
**Situação:** implementado, sem erros de tipo e testado no navegador com API simulada. Sem commit e sem push, aguardando aprovação.
**API correspondente:** BackEndJava, mesma branch (`Docs/IMPLEMENTACAO_VINCULO_DETALHES_EXECUCAO.md`).

## 1. O que mudou para o usuário

| Antes | Agora |
|---|---|
| "Execução bloqueada" por documentos pendentes | A viagem inicia. Documentos aparecem como "Para regularizar (não impede iniciar)". **O vínculo ativo com a escola continua obrigatório** (decisão de 13/11/2026) |
| Início do motorista: "Documentos impedem o início das viagens" (alerta vermelho) | "Documentos pendentes · Isso não impede iniciar as viagens" (aviso amarelo) |
| Aluno já na viagem continuava com "Pedir vaga" na busca | "Já está nesta viagem" ou, com pedido em aberto, "Aguardando resposta" |
| Convite/pedido com só nome e viagem; "Aceitar" abria uma confirmação genérica | "Ver e aceitar" abre um pop-up com os dados da outra pessoa e os botões "Aceitar vínculo" e "Recusar" |
| Sem como ver de quem é o vínculo depois | "Ver dados do motorista" (responsável) e "Ver dados do responsável" (motorista) nos cards |

## 2. Pop-up (`src/components/CounterpartModal.tsx`, novo)

- O responsável vê o motorista: contato, região de atuação, veículo, viagem e escolas, avaliação média.
- O motorista vê o responsável e o aluno: contato, região, viagem e dados do aluno (nome, idade, escola, período, bairro).
- **Privacidade:** só nome e telefone completos. CPF, e-mail e placa já chegam mascarados da API; endereço só bairro e cidade. No celular há o botão "Ligar".
- Com `canAnswer`, mostra "Aceitar vínculo" e "Recusar"; sem, só "Fechar".

## 3. Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/CounterpartModal.tsx` | Novo pop-up |
| `src/screens/GuardianInvitesScreen.tsx` | "Ver e aceitar" no convite abre o pop-up (substitui a confirmação); "Ver dados do motorista" nos demais cards |
| `src/screens/DriverInvitesScreen.tsx` | "Ver e aceitar" no pedido de vaga abre o pop-up; "Ver dados do responsável" nos convites enviados |
| `src/screens/GuardianSearchDriverScreen.tsx` | Usa `viagensComAluno` e `viagensComSolicitacaoPendente` para não oferecer "Pedir vaga" onde o aluno já está ou já tem pedido |
| `src/screens/DriverTripDayScreen.tsx` | Mostra `avisos` da prontidão como lista "Para regularizar (não impede iniciar)"; o botão de iniciar só olha os bloqueios |
| `src/screens/DriverMainScreen.tsx` | Card de documentos passa a ser aviso, não bloqueio |
| `src/services/api.ts` | Rotas `/Motorista/Solicitacoes/{id}/Contraparte` e `/Responsavel/Solicitacoes/{id}/Contraparte` |
| `src/services/motoristaService.ts`, `responsavelService.ts` | `contraparte(idSolicitacao)` |
| `src/services/viagemService.ts` | `prontidao` devolve `avisos` |
| `src/services/documentoService.ts` | Comentário: documentos são aviso |
| `src/types.ts` | `ContraparteDTO`; `ProntidaoViagemDTO.avisos`; `MotoristaDisponivelDTO.viagensComAluno` e `viagensComSolicitacaoPendente` |

## 4. Como foi testado

- `npx tsc --noEmit`: sem erros. Antes foi preciso rodar `npm install`, porque o commit do Otavio na `homologacao` adicionou pacotes (mapas, localização, rede).
- No navegador, com API simulada seguindo o contrato:
  - responsável: "Ver e aceitar" abre o pop-up com telefone completo e CPF, e-mail e placa mascarados; "Aceitar vínculo" move para "Ativos (1)" e o convite some;
  - busca de motoristas: a viagem aceita mostra "Já está nesta viagem";
  - motorista: "Ver e aceitar" mostra responsável e aluno; o Início mostra "Documentos pendentes · Isso não impede iniciar as viagens".
- Não testado com a API real e banco (fazer no Codespace).
