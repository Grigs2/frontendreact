# Contrato: linha de estações do responsável

Contrato para o backend implementar a visão "linha de estações" do responsável. Ela aparece como alternativa ao mapa e não depende do Google Maps.

Os tipos do front estão em `src/types.ts` (`LinhaParadaDTO`, `LinhaViagemDTO`). O endpoint está em `src/services/api.ts` (`linhaViagemDia`), e a chamada em `src/services/localizacaoService.ts` (`linha`).

## Endpoint

```
GET /Viagem/ViagemDia/{viagemDiaId}/Linha?dependenteId={id}
```

- **Autorização:** a mesma da rota do responsável (`GET /Viagem/ViagemDia/{viagemDiaId}/Rota`). Só o responsável do aluno e só com o consentimento de localização desse aluno.
- **Erros:** os mesmos da rota. Quando não há consentimento ou GPS, a resposta deve seguir o padrão de erro já usado na rota. `dependenteId` que não pertence ao usuário logado: `403`.
- **Disponibilidade:** não pode depender da API do Google. Se a rota do Google falhar, este endpoint continua respondendo.

## Resposta: `LinhaViagemDTO`

```json
{
  "disponivel": true,
  "mensagem": null,
  "indiceAtual": 2,
  "paradas": [
    { "ordem": 1, "tipoParada": "RESPONSAVEL", "acao": "EMBARQUE", "concluida": true,  "doFilho": false, "rotulo": null },
    { "ordem": 2, "tipoParada": "RESPONSAVEL", "acao": "EMBARQUE", "concluida": false, "doFilho": true,  "rotulo": "Casa do Enzo" },
    { "ordem": 3, "tipoParada": "ESCOLA",      "acao": "DESEMBARQUE", "concluida": false, "doFilho": false, "rotulo": "Colégio X" }
  ]
}
```

| Campo | Tipo | Regra |
|---|---|---|
| `disponivel` | boolean | `false` quando não há viagem em andamento ou dados suficientes. |
| `mensagem` | string \| null | Texto para o app mostrar quando `disponivel` é `false`. |
| `indiceAtual` | int \| null | `ordem` da parada atual: a primeira parada com aluno pendente. `null` antes de sair ou depois de concluir a viagem. |
| `paradas[]` | array | Paradas com aluno, na ordem da rota. Não inclui as paradas `MOTORISTA` (início e fim). Não filtra por aluno: todas as paradas de alunos aparecem, sem nome nem endereço. |
| `paradas[].ordem` | int | Número sequencial entre as paradas devolvidas, começando em 1. É o mesmo número de "Parada N" no app do motorista. |
| `paradas[].tipoParada` | `RESPONSAVEL` \| `ESCOLA` | Tipo da parada. `MOTORISTA` nunca é devolvido. |
| `paradas[].acao` | `EMBARQUE` \| `DESEMBARQUE` | Ida: embarque nas casas e desembarque na escola. Volta: o contrário. |
| `paradas[].concluida` | boolean | Calculada no servidor. Concluída quando ninguém mais aguarda na parada e ninguém a bordo deveria desembarcar nela. O app não recebe os dados dos outros alunos, então não consegue calcular isso sozinho. |
| `paradas[].doFilho` | boolean | `true` só para a parada do aluno consultado. |
| `paradas[].rotulo` | string \| null | Ver regra de privacidade abaixo. |

## Regra de privacidade (obrigatória)

O responsável não pode ver endereço nem nome de outras famílias.

- **`rotulo` é preenchido só em dois casos:**
  - `tipoParada = ESCOLA`: nome da escola;
  - `doFilho = true`: `Casa do {primeiroNome}` do aluno consultado.
- **Nas outras casas, `rotulo` é `null`.** O app mostra "Parada N".
- **Endereço nunca vai nesta resposta**, nem para a parada do aluno. O endereço fica no detalhe do aluno.
- As coordenadas também não entram neste contrato. A posição da perua continua vindo de `GET /Viagem/Localizacao/Atual/{viagemDiaId}`.

## Regras de negócio

- A ordem das paradas segue a rota do motorista. Ao reordenar (`PUT /Viagem/ReordenarParadasViagemDia/{idViagemDia}`), a resposta reflete a ordem atual.
- Paradas com alunos que faltaram ficam `concluida: true` quando a viagem passa delas.
- `indiceAtual` é a primeira parada com aluno pendente, o mesmo critério da parada atual do atendimento de chamada no motorista.
- A resposta não depende do Google. Sem rota calculada, `indiceAtual` e `concluida` continuam sendo calculados pelos dados de presença e de ordem.

## Pendências para o backend

O formato e o nome do endpoint estão acertados entre front e back. O front ainda não usa este endpoint na tela: ela depende deste contrato estar implementado.
