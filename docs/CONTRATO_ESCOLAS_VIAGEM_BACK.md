# Contrato: escolas da viagem (front e back)

## Endpoints

### 1. Listar escolas disponíveis

`GET /Viagem/EscolasDisponiveis/{idViagem}`

Autorização: motorista dono da viagem.

Retorna as escolas com vínculo `ATIVO` do motorista que ainda não estão na viagem. Pode reutilizar o DTO de escola já existente, com id e nome.

### 2. Adicionar escolas

`POST /Viagem/AdicionarEscolas/{idViagem}`

Autorização: motorista dono da viagem.

Corpo:

```json
{
  "escolaIds": [1, 2]
}
```

| Código | Situação |
|---|---|
| 200 | `ViagemDTO` atualizado. Escolas já presentes são ignoradas. |
| 400 | `escolaIds` vazio ou com ids repetidos no corpo, ou escola sem vínculo `ATIVO` |
| 403 | motorista não é dono da viagem |
| 404 | viagem ou escola não encontrada |
| 409 | viagem desativada ou iniciada |

### Reaproveitados

Os endpoints abaixo já existem e recebem a nova regra de bloqueio (R6):

- `PUT /Viagem/AtualizarNome/{idViagem}`
- `PUT /Viagem/AlterarHorarioPartida/{idViagem}`

## Regras de negócio

**R1. Criação.** `criarViagem` exige ao menos uma escola. Lista vazia retorna `400`.

**R2. Migração de viagens legadas.** Uma única vez, cada viagem sem escola recebe as escolas dos seus `ViagemDependente` ativos.

**R3. Adicionar escola.**
- Altera apenas `viagem_escola_destino`. O `ViagemDependente` não muda.
- Não insere alunos nas execuções. Eles entram só quando o responsável aceita uma nova solicitação.
- Não recalcula paradas existentes, então a ordem manual é preservada.
- Dias iniciados não mudam.

**R4. Suspensão ou encerramento do vínculo com a escola** (`suspender` e `encerrar` em `VinculoEscolaService`). Além da desativação de `ViagemDependente` que já existe:
- Remove a escola de `viagem_escola_destino` em todas as viagens do motorista.
- Remove as `ViagemParada` e presenças desses alunos em dias `PLANEJADA` a partir de hoje.
- Recusa as solicitações abertas desses alunos com a escola (`RECUSADA`) e notifica o responsável.
- Dias iniciados não mudam.

**R5. Reativação do vínculo** (`reativar`). Não restaura escolas nem alunos. O motorista adiciona a escola de novo, e os alunos precisam de nova solicitação.

**R6. Viagem iniciada.** Considera-se iniciada se o dia de hoje estiver `EM_ANDAMENTO`, `FINALIZADA` ou `INTERROMPIDA`. `CANCELADA` não bloqueia. Nesse caso, renomear, alterar horário e adicionar escolas retornam `409`.

**R7. Ordem manual.** Preservada em todos os fluxos. Não há recálculo de paradas existentes.

**R8. Última escola removida.** A viagem é desativada (`ativo = false`). Acordos e solicitações abertas da viagem são encerrados.

**R9. Paradas ocultas.** Paradas de escola removida com histórico ficam ocultas e não são retornadas ao front.

**R10. Aceite de solicitação.** Aceitar solicitação de aluno de escola não atendida retorna `409`. Recusar continua permitido.

## Trabalho no back

1. Endpoints `GET /Viagem/EscolasDisponiveis/{idViagem}` e `POST /Viagem/AdicionarEscolas/{idViagem}`, com service.
2. Validação de vínculo `ATIVO` na adição (R3, erro 400).
3. Inserção de paradas e presenças ao adicionar escola (R3).
4. Extensão de `suspender` e `encerrar` conforme R4.
5. Checagem de viagem iniciada em renomear, horário e adicionar escolas (R6).
6. Validação de escolas obrigatórias na criação (R1).
7. Migração única das viagens legadas (R2).
8. Testes para cada regra.
