





# PLANO DE IMPLEMENTAÇÃO — FRONTEND

## OBJETIVO 
Corrigir inconsistências de renderização e tratamento de dados nas telas de Monitoramento e Histórico, garantindo que as informações exibidas sejam derivadas corretamente dos endpoints do BackEnd.
 

## 1. RESPONSÁVEL — TELA MONITORAR DEPENDENTE

Tela:
Monitoramento de Dependente

Endpoint principal:
GET /Responsavel/Monitorar/{id_dependente}

---

## 1.1 Diagnóstico Inicial

Problemas atuais:

* Histórico de viagens não aparece.
* Período da viagem aparece nulo.
* Data da ViagemDia aparece nula.
* Dados inconsistentes entre endpoints.

Antes da implementação:

1. Verificar a estrutura real recebida pelo endpoint.
2. Validar logs do response.
3. Confirmar:

   * nomes exatos das propriedades;
   * tipos;
   * campos opcionais;
   * ids utilizados em endpoints complementares.

---

## 1.2 Estrutura Correta da Tela

### TOPO DA TELA

Manter:

* Nome do dependente.
* Troca de dependente.

---

## 1.3 CARD SUPERIOR — STATUS ATUAL

Os dados devem ser montados utilizando:

GET /Responsavel/Monitorar/{id}
GET /Viagem/ConsultarMotorista/{idViagemDia}
GET /Viagem/VisualizarViagemDia/{id_viagemDia}
GET /Viagem/Visualizar/{id_viagem}

Fluxo correto:

1. Obter `statusAtual.viagemDiaId`.
2. Buscar:
   GET /Viagem/VisualizarViagemDia/{id_viagemDia}
3. A partir do retorno:

   * obter `viagem.id`
   * obter `ultimaAlteracao`
   * obter `data`
4. Buscar:
   GET /Viagem/Visualizar/{id_viagem}
5. Obter:

   * periodo da viagem
6. Buscar:
   GET /Viagem/ConsultarMotorista/{idViagemDia}
7. Obter:

   * nome do motorista
   * telefone
   * veículo

---

## 1.4 HISTÓRICO RECENTE

A lista deve ser renderizada usando:
`historicoRecente[]`

IMPORTANTE:
O histórico NÃO deve depender apenas do endpoint principal para montar os cards completos.

Para cada item:

1. Obter `viagemDiaId`
2. Buscar:
   GET /Viagem/VisualizarViagemDia/{id_viagemDia}
3. Obter:

   * data da viagem;
   * ultima alteração;
   * viagem.id
4. Buscar:
   GET /Viagem/Visualizar/{id_viagem}
5. Obter:

   * período da viagem
6. Buscar:
   GET /Viagem/ConsultarMotorista/{idViagemDia}
7. Obter:

   * nome do motorista

---

## 1.5 CARDS DO HISTÓRICO

Cada card deve mostrar:

* Período da Viagem
* Data da ViagemDia
* Nome do Motorista
* Hora da Última Alteração da ViagemDia

Ordenação:

* Mais recente primeiro.

---

## 1.6 PERFORMANCE

Implementar:

* cache local por `viagemDiaId`;
* cache local por `viagemId`;
* `Promise.all` para carregamentos paralelos;
* evitar chamadas duplicadas.

---

## 1.7 TRATAMENTO DE ERROS

Implementar:

* loading state;
* empty state;
* fallback para valores ausentes;
* tratamento de falha parcial.

A tela nunca deve ficar branca.

---

# 2. MOTORISTA — HISTÓRICO DE VIAGEM

Tela:
Histórico do Motorista

Problema:
Lista de passageiros está inconsistente.

---

## 2.1 DIAGNÓSTICO

Verificar:

* estrutura do retorno do endpoint;
* mapeamento de passageiros;
* dependentes repetidos;
* passageiros faltando;
* ordenação incorreta;
* erro de chave em listas React.

Endpoint:
GET /Viagem/Historico/{id_motorista}

---

## 2.2 IMPLEMENTAÇÃO

Garantir que cada ViagemDia renderize:

* período;
* data;
* status;
* lista correta de passageiros;
* status individual dos passageiros.

Validar:

* renderização por `viagemDia.id`;
* listas internas usando ids únicos;
* agrupamento correto por viagem.

---

## 2.3 ESTABILIDADE

Evitar:

* re-renderizações desnecessárias;
* mutação direta de arrays;
* sobrescrita de estados assíncronos.

Usar:

* useMemo;
* useCallback;
* normalização de dados.

---

# 3. VALIDAÇÃO FINAL

Executar:

* npm run tsc -- --noEmit
* npm run lint (se existir)
* npx expo start --web

---

# CRITÉRIOS DE ACEITAÇÃO

A implementação será considerada concluída quando:

* Histórico recente aparecer corretamente.
* Período da viagem deixar de ficar nulo.
* Data da ViagemDia deixar de ficar nula.
* Dados do motorista forem consistentes.
* Cards do histórico exibirem dados corretos.
* Lista de passageiros do motorista estiver correta.
* Nenhuma tela branca ocorrer.
* Web e Mobile funcionarem corretamente.

---

# ENTREGÁVEIS

1. Código atualizado.
2. Resumo das alterações realizadas.
3. Confirmação de compilação sem erros.