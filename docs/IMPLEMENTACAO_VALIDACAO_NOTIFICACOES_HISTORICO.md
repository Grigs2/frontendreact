# Implementação: validação, termos, notificações, histórico, ausência, atraso e push (app)

**Projeto:** Tio da Perua · **Branch:** `feat/inicio-busca-cadastros` (sem commit, aguardando aprovação) · **Data:** 06/11/2026

Este documento registra o que mudou no **app** para atender à especificação `docs/ESPECIFICACAO_VALIDACAO_NOTIFICACOES_HISTORICO.md`. A parte da API está em `BackEndJava/Docs/IMPLEMENTACAO_NOTIFICACOES_HISTORICO_TERMOS.md`.

**Fora desta entrega:** "motorista próximo" (depende de GPS em segundo plano), NFC, preferências de notificação por tipo e troca de motorista. Dependem de decisões do grupo.

---

## 1. Resumo

| Frente | O que o usuário vê |
|---|---|
| Central de notificações | Abas **Não lidas / Todas**, filtros (Tudo, Viagem, Alertas, Vínculos, Avisos), agrupamento por dia (Hoje, Ontem, data), alertas em vermelho, "Marcar todas como lidas", "Carregar mais" e toque que leva ao lugar certo |
| Sino | Número de não lidas (atualiza ao trocar de tela e a cada minuto) |
| Histórico do responsável | Por aluno: data, viagem, embarque e entrega com horário, motorista e placa, cancelamento com motivo; períodos de 30 dias, 3 meses e 1 ano |
| Histórico do motorista | Cartões com nome, período, horário de início e fim, contagens (embarcaram, entregues, faltas) e motivo; toque abre a lista de alunos |
| Avisar falta | Responsável escolhe dia (até 14 dias à frente), trecho (ida e volta, só ida, só volta) e motivo; vê e cancela os avisos |
| Avisar atraso | Motorista escolhe 5 a 45 min e o motivo, com a viagem planejada ou em andamento |
| Validação | Erro aparece ao sair do campo; ao tocar em Continuar/Salvar, o foco vai para o primeiro campo com erro |
| Termos | Botão "Baixar PDF", link no Login e em Perfil › Mais opções, e novo aceite quando a versão muda |
| Push | Registro do aparelho depois do login (só celular), canais "Viagem" e "Alertas" no Android, toque abre a tela certa, aparelho removido ao sair |

---

## 2. Arquivos novos

| Arquivo | Função |
|---|---|
| `src/components/AbsenceModal.tsx` | Modal "Avisar falta": dia, trecho, motivo (até 200), lista de ausências avisadas com "Cancelar" |
| `src/components/TermsReacceptGate.tsx` | Mostra os termos com "Li e aceito" quando o login devolve `termosPendentes = true`. Sem aceitar, sai da conta |
| `src/components/PushNotificationsHandler.tsx` | Registra o push depois do login e trata o toque no aviso. Não faz nada no navegador |
| `src/services/pushService.ts` | Permissão, canais do Android, `ExpoPushToken` e `POST /Notificacao/Dispositivos` |

## 3. Arquivos alterados

### Tipos e serviços

| Arquivo | Mudança |
|---|---|
| `src/types.ts` | `NotificacaoDTO` ganhou `tipo`, `prioridade`, `viagemDiaId`, `dependenteId`, `lidaEm` (opcionais). Novos: `TipoNotificacao`, `GrupoNotificacao`, `ViagemDiaResumoDTO`, `HistoricoAlunoDTO`, `AusenciaDTO`, `TrechoAusencia`. `AutenticacaoResponseDTO.termosPendentes` |
| `src/services/api.ts` | Endpoints novos (contagem, marcar todas, dispositivos, histórico do aluno, ausências, atraso, termos). `/Termos/vigente` entrou na lista de rotas públicas |
| `src/services/notificacaoService.ts` | `listarCentral(idUsuario, {status, grupo, pagina, tamanho})`, `contarNaoLidas`, `marcarTodasLidas`, `registrarDispositivo`, `removerDispositivo`. `listar` sem filtro continua igual |
| `src/services/responsavelService.ts` | `historicoDependente`, `listarAusencias`, `avisarAusencia`, `cancelarAusencia` |
| `src/services/viagemService.ts` | `historico(id, de?, ate?)` agora devolve `ViagemDiaResumoDTO[]`; novo `avisarAtraso` |
| `src/services/authService.ts` | `aceitarTermos`, `termosVigente`. `sair()` também avisa a API para parar o push do aparelho (sem esperar a resposta) |
| `src/services/authSession.ts` | Guarda `termosPendentes` da resposta de login/renovação |
| `src/services/config.ts` | `TERMOS_PDF_URL` (link permanente do PDF) |
| `src/context/AppContext.tsx` | `unreadCount`, `refreshUnreadCount`, `setUnreadCount` (zera ao sair) |

### Telas e componentes

| Arquivo | Mudança |
|---|---|
| `src/components/AppLayout.tsx` | Selo vermelho com o número de não lidas no sino (até "99+") e rótulo de acessibilidade com a contagem |
| `src/screens/NotificationListScreen.tsx` | Reescrita como central (ver resumo). Toque marca como lida e abre: Vínculos (solicitação), acompanhamento do aluno (responsável) ou Rotas (motorista). O botão "Nova" ficou só para a escola |
| `src/screens/HistoryScreen.tsx` | Era um aviso "em implementação"; agora é o histórico do responsável, com "Avisar falta" no topo |
| `src/screens/DriverHistoryScreen.tsx` | Usa o resumo novo (uma chamada só, sem buscar as paradas de cada viagem). Lista de alunos carregada ao abrir o cartão. Filtro de período |
| `src/screens/DriverAttendanceScreen.tsx` | Botão "Avisar atraso" e modal |
| `src/screens/GuardianDependentsScreen.tsx` | "Avisar falta" no cartão do aluno que já tem transporte |
| `src/screens/RegisterScreen.tsx` | Validação por campo (`fieldValidators`), `onBlur` e foco no primeiro erro; termos fora da tela fazem a tela rolar até o fim |
| `src/screens/GuardianDependentFormScreen.tsx` | Mesmo padrão para nome, CPF e nascimento; escola/endereço com erro fazem a tela rolar |
| `src/components/forms/TermsModal.tsx` | "Baixar PDF", aviso opcional no topo (`notice`), estado de carregamento e rótulo do botão de recusa |
| `src/screens/LoginScreen.tsx` | Link "Termos de Uso e Política de Privacidade" |
| `src/screens/ProfileScreen.tsx` | "Termos e privacidade" em Mais opções |
| `App.tsx` | Monta `TermsReacceptGate` e `PushNotificationsHandler` |
| `app.json` | Plugin `expo-notifications` (cor `#FFC400`) |
| `package.json` | Dependência `expo-notifications ~58.1.8` (instalada com `npx expo install`) |

### Script

| Arquivo | Função |
|---|---|
| `scripts/gerar_pdf_termos.py` | Gera o PDF dos termos a partir de `src/content/termosPrivacidade.ts` (mesmo texto do app). Uso: `python scripts/gerar_pdf_termos.py src/content/termosPrivacidade.ts <saida.pdf>` (precisa de `fpdf2`). O PDF gerado fica no backend em `src/main/resources/static/termos/` |

---

## 4. Regras de comportamento

**Validação ao sair do campo**
- Campo vazio não mostra erro ao sair; é cobrado ao tocar em Continuar/Salvar.
- Ao digitar, o erro do campo some; ao sair, a validação roda de novo.
- Ao avançar com erro, o foco vai para o primeiro campo da etapa com erro, na ordem da tela (o navegador e o teclado do celular rolam até ele).

**Central de notificações**
- Página de 30 itens. "Carregar mais" aparece quando a página veio cheia; o fim da lista também carrega.
- Marcar como lida é otimista: some da aba "Não lidas" na hora; se a API falhar, a lista recarrega.
- Avisos manuais mostram "De <remetente>". Avisos automáticos não mostram remetente nem telefone (privacidade).
- Compatível com a API antiga: sem `tipo`, o aviso aparece como geral.

**Novo aceite dos termos**
- A API compara a versão aceita com `TERMS_VERSION`. Quando muda, o login devolve `termosPendentes = true` e o app abre os termos.
- "Não aceito (sair da conta)" encerra a sessão.

**Push**
- Só em celular (`Platform.OS !== 'web'`). Falhas de permissão ou de rede não atrapalham o uso.
- Para gerar o token fora do Expo Go é preciso o ID do projeto no EAS: definir `EXPO_PUBLIC_EAS_PROJECT_ID` no `.env.local`. Para testar push é preciso uma *development build* (o Expo Go não recebe push remoto desde o SDK 53).
- Ao sair, o app remove o aparelho na API antes de apagar a sessão local.

---

## 5. Como foi testado

- `npx tsc --noEmit`: sem erros.
- No navegador (`expo start --web`) com uma API simulada no próprio navegador, seguindo o contrato da API:
  - responsável: contador no sino (2), central com abas, filtro "Alertas", agrupamento Hoje/Ontem/data, "Marcar todas" (toast "2 notificações marcadas como lidas" e o selo some);
  - histórico do aluno (entregue, cancelada com motivo, faltou);
  - avisar falta (201), aviso repetido no mesmo dia recusado (409 com a mensagem da API), cancelar (204);
  - novo aceite dos termos ao entrar (`POST /Autenticacao/AceitarTermos` → 204, modal fecha);
  - link dos termos no Login e "Termos e privacidade" no Perfil, com "Baixar PDF";
  - motorista: histórico com contagens e motivo; avisar atraso de 30 min com motivo (`POST /Viagem/ViagemDia/77/Atraso` → 204, toast "Responsáveis avisados do atraso.");
  - cadastro: e-mail inválido mostra erro ao sair do campo; Continuar com senha vazia leva o foco para "Senha".
- **Não testado:** push em aparelho real (precisa de development build e ID do EAS) e a API real com PostgreSQL.
