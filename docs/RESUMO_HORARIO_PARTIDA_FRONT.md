# Resumo: horário de partida da viagem (front)

Branch: `feat/departure-time`
Contrato compartilhado com o back: [IMPLEMENTACAO_HORARIO_PARTIDA_VIAGEM.md](./IMPLEMENTACAO_HORARIO_PARTIDA_VIAGEM.md)

## Commits no branch

- `8329b79` feat: esconde barras do sistema no Android (`expo-navigation-bar`)
- `6ba0d2f` docs: contrato de horário de partida da viagem
- `8ddf620` docs: decisões do contrato de horário de partida

## Regras de negócio implementadas

- Ao criar a viagem, o motorista informa o horário de partida (HH:mm). Sem informação, o padrão é 07:00 (manhã), 12:00 (tarde) e 17:00 (noite).
- O horário padrão da viagem não tem botão de alteração na tela de detalhes.
- Cada dia pode ter horário próprio, alterado pelo ícone de relógio ao lado do lápis no título da viagem.
- Restaurar o padrão do dia remove o horário próprio e volta ao horário da viagem.
- A alteração de dia só vale para execuções planejadas (não iniciadas).
- O horário não impede o motorista de iniciar a viagem em outro horário.

## Telas e componentes alterados

- **Serviços:** [api.ts](./../src/services/api.ts) (endpoints `alterarHorarioPartida` e `alterarHorarioPartidaDia`) e [viagemService.ts](./../src/services/viagemService.ts) (horário padrão por período, máscara HH:mm, criação com horário e alterações).
- **Tipos:** [types.ts](./../src/types.ts) com `horarioPartida` e `horarioPartidaPersonalizado`.
- **Criar viagem** ([DriverTripsScreen.tsx](./../src/screens/DriverTripsScreen.tsx)): campo de horário com máscara automática (só dígitos, `:` inserido após o segundo dígito).
- **Rotas** ([DriverTripsScreen.tsx](./../src/screens/DriverTripsScreen.tsx)): tag azul com o horário no canto superior direito de cada card, acima do status.
- **Detalhes da viagem** ([DriverTripDetailsScreen.tsx](./../src/screens/DriverTripDetailsScreen.tsx)): subtítulo com "saída HH:mm" e ícone de relógio ao lado do lápis.
- **Modal de horário** ([EditarHorarioPartidaModal.tsx](./../src/components/EditarHorarioPartidaModal.tsx)): novo componente, com máscara e opção de restaurar o padrão.
- **Cabeçalho** ([ScreenHeader.tsx](./../src/components/ui/ScreenHeader.tsx)): novo slot `titleAccessory` para ações ao lado do título.
- **Início** ([DriverMainScreen.tsx](./../src/screens/DriverMainScreen.tsx)): botão "Próxima viagem HH:mm →".

## Barras do sistema (Android)

- Barra de status e de navegação ocultas, com reaparecimento temporário ao deslizar.
- Mudança nativa: exige novo APK para funcionar.

## Validação

- `npx tsc --noEmit` sem erros.
- Testado no navegador anteriormente: exibição do horário, ajuste e restauração do dia, modal com o horário da viagem e máscara no modal de dia.

## Pendências

- Publicar as alterações de tela no celular (EAS Update no canal `preview`) e gerar um APK novo por causa da barra de status oculta.
- Confirmar com o back os nomes dos campos `inicio`/`fim` do resumo diário (`ViagemDiaResumoDTO`), que o contrato chama de `horarioInicio`/`horarioFim`.
- Telas do responsável e histórico ainda não mostram o horário de partida.
- Formulário de criação da viagem ainda não foi testado no navegador.
- Tag azul das Rotas feita como chip do tema; conferir contra a imagem de referência.
