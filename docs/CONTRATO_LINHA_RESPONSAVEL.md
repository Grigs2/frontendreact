# Contrato: linha de estações do responsável

Contrato para o backend implementar a visão "linha de estações" do responsável. Ela aparece como alternativa ao mapa e não depende do Google Maps.

Os tipos do front estão em `src/types.ts` (`LinhaParadaDTO`, `LinhaViagemDTO`). O endpoint está em `src/services/api.ts` (`linhaViagemDia`), e a chamada em `src/services/localizacaoService.ts` (`linha`).

## Endpoint

```
GET /Viagem/ViagemDia/{viagemDiaId}/Linha?dependenteId={id}
```

- **Autorização:** a mesma da rota do responsável (`GET /Viagem/ViagemDia/{viagemDiaId}/Rota`). Só o responsável do aluno e só com o consentimento de localização desse aluno.
- **Erros:** os mesmos da rota. Quando não há consentimento ou GPS, a resposta deve seguir o padrão de erro já usado na rota.
- **Disponibilidade:** não pode depender da API do Google. Se a rota do Google falhar, este endpoint continua respondendo.

## Resposta: `LinhaViagemDTO`

```json
{
  "disponivel": true,
  "mensagem": null,
  "indiceAtual": 3,
  "paradas": [
    { "ordem": 1, "tipoParada": "RESPONSAVEL", "acao": "EMBARQUE", "concluida": true,  "doFilho": false, "rotulo": null },
    { "ordem": 2, "tipoParada": "RESPONSAVEL", "acao": "EMBARQUE", "concluida": true,  "doFilho": false, "rotulo": null },
    { "ordem": 3, "tipoParada": "RESPONSAVEL", "acao": "EMBARQUE", "concluida": false, "doFilho": true,  "rotulo": "Casa do Enzo" },
    { "ordem": 4, "tipoParada": "ESCOLA",      "acao": "DESEMBARQUE", "concluida": false, "doFilho": false, "rotulo": "Colégio X" }
  ]
}
```

| Campo | Tipo | Regra |
|---|---|---|
| `disponivel` | boolean | `false` quando não há viagem em andamento ou dados suficientes. |
| `mensagem` | string \| null | Texto para o app mostrar quando `disponivel` é `false`. |
| `indiceAtual` | int \| null | `ordem` da parada que a perua está seguindo. `null` antes de sair ou depois de concluir a viagem. |
| `paradas[]` | array | Todas as paradas da viagem, na ordem da rota, sem filtrar pelo aluno. |
| `paradas[].ordem` | int | Posição na rota, começando em 1. |
| `paradas[].tipoParada` | `MOTORISTA` \| `RESPONSAVEL` \| `ESCOLA` | Tipo da parada. |
| `paradas[].acao` | `EMBARQUE` \| `DESEMBARQUE` | Ida: embarque nas casas e desembarque na escola. Volta: o contrário. |
| `paradas[].concluida` | boolean | Mesma regra da linha do motorista (`RotaEstacoes`): concluída quando ninguém mais aguarda na parada e ninguém a bordo deveria desembarcar nela. |
| `paradas[].doFilho` | boolean | `true` só para a parada do aluno consultado. |
| `paradas[].rotulo` | string \| null | Ver regra de privacidade abaixo. |

## Regra de privacidade (obrigatória)

O responsável não pode ver endereço nem nome de outras famílias.

- **`rotulo` é preenchido só em dois casos:**
  - `tipoParada = ESCOLA`: nome da escola;
  - `doFilho = true`: nome de exibição da parada do aluno consultado.
- **Nas outras casas, `rotulo` é `null`.** O app mostra "Parada N".
- **Endereço nunca vai nesta resposta**, nem para a parada do aluno. O endereço fica no detalhe do aluno.
- As coordenadas também não entram neste contrato. A posição da perua continua vindo de `GET /Viagem/Localizacao/Atual/{viagemDiaId}`.

## Regras de negócio

- `paradas` segue a mesma ordem e os mesmos dados da rota do motorista. A ordem muda quando o motorista reordena (`PUT /Viagem/ReordenarParadasViagemDia`), e a resposta reflete a ordem atual.
- Paradas de embarque e desembarque com alunos que faltaram devem ficar `concluida: true` quando a viagem passar delas, igual ao motorista.
- `indiceAtual` deve bater com a parada atual do motorista (a mesma usada no atendimento de chamada).
- A resposta não precisa do Google. Se não houver rota calculada, `indiceAtual` e `concluida` ainda são calculados pelos dados de presença e de ordem.

## Pendências para o backend

1. Confirmar o nome do endpoint (`/Linha`) e o formato de erro com o time do backend.
2. Confirmar que `rotulo` da parada do aluno usa o mesmo nome que aparece para o responsável hoje.
3. O front ainda não usa este endpoint na tela. A tela depende deste contrato estar pronto.
