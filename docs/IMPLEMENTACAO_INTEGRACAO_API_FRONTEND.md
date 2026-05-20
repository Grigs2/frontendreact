# IMPLEMENTACAO_INTEGRACAO_API_FRONTEND.md

## Objetivo

Este documento descreve o plano de implementação para adequar o FrontEnd do projeto **Tio da Perua** para consumir integralmente a API do BackEnd Java, garantindo:

1. Consumo funcional de todos os endpoints descritos em `API_DOCUMENTACAO_COMPLETA.md`.
2. Sincronização total entre os dados exibidos no aplicativo e os dados persistidos no BackEnd.
3. Correção dos fluxos de navegação para eliminar telas sem saída.
4. Aderência aos fluxos de negócio definidos no BackEnd.
5. Padronização arquitetural para futuras funcionalidades.

Este documento complementa o `GEMINI.md` do FrontEnd e deve ser seguido integralmente pela IA Gemini CLI.

---

# 1. Documentos Obrigatórios de Referência

Antes de qualquer alteração, a IA DEVE ler integralmente:

1. `GEMINI.md`
2. `API_DOCUMENTACAO_COMPLETA.md`
3. `src/navigation/index.ts`
4. `src/services/api.ts`
5. `src/services/authService.ts`
6. `src/types.ts`
7. Todas as telas em `src/screens/`

Nenhuma implementação deve ser feita sem considerar estes arquivos.

---

# 2. Objetivos Técnicos

## 2.1 Integração Completa com API

Todos os endpoints existentes no BackEnd devem estar acessíveis por serviços TypeScript.

## 2.2 Sincronização de Dados

Toda informação apresentada ao usuário deve refletir exatamente o estado persistido no BackEnd.

## 2.3 Navegação Segura

Toda tela deve possuir pelo menos uma ação de saída.

## 2.4 Aderência ao Fluxo de Negócio

As chamadas à API devem respeitar a ordem lógica definida no BackEnd.

---

# 3. Arquitetura de Integração

## 3.1 Camadas do FrontEnd

### Screens

Responsáveis apenas por:

* Renderizar interface.
* Capturar input.
* Chamar services.
* Navegar.

### Services

Responsáveis por:

* Fazer chamadas HTTP.
* Montar URLs.
* Tipar request e response.
* Tratar erros básicos.

### Types

Responsáveis por:

* Representar todos os DTOs da API.

### Navigation

Responsável por:

* Fluxo entre telas.
* Tipagem das rotas.

---

# 4. Estrutura Obrigatória de Services

## 4.1 Organização

Criar ou reorganizar os serviços em:

```text
src/services/
  api.ts
  motoristaService.ts
  responsavelService.ts
  escolaService.ts
  viagemService.ts
  solicitacaoService.ts
  notificacaoService.ts
  authService.ts
```

---

## 4.2 Regra de Implementação

Cada endpoint documentado deve possuir uma função específica.

### Exemplo

```ts
export async function cadastrarMotorista(data: MotoristaDTO): Promise<MotoristaDTO> {
  const response = await api.post('/Motorista/Cadastrar', data);
  return response.data;
}
```

---

# 5. Padronização dos DTOs TypeScript

Todos os DTOs documentados no BackEnd devem possuir interfaces TypeScript.

## Exemplo

```ts
export interface UsuarioDTO {
  id?: number;
  email: string;
  senha?: string | null;
  endereco: string;
  telefone: string;
  tipoPerfil: string;
}
```

---

# 6. Base URL

## api.ts

O arquivo `src/services/api.ts` deve exportar uma instância Axios configurada.

### Exemplo

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://SEU_IP:8080/TioDaPerua/api',
  timeout: 10000,
});
```

---

# 7. Mapeamento de Endpoints

A IA deve ler `API_DOCUMENTACAO_COMPLETA.md` e garantir que TODOS os endpoints descritos estejam implementados.

## Categorias mínimas

### Motorista

* Cadastro
* Login
* Cadastrar veículo
* Criar viagem
* Criar Solicitação de vinculo de Depedente à Viagem
* Iniciar viagem do dia
* Buscar paradas
* Alterar status de dependente
* Alterar status de viagem

### Responsável

* Cadastro
* Login
* Cadastrar dependente
* Listar escolas
* Vincular escola
* Buscar solicitações
* Resposnder Solicitação
* Encerrar vínculo

### Escola

* Cadastro
* Login

### Solicitação

* Criar
* Listar
* Aceitar
* Rejeitar

### Viagem

* CRUD
* Execução diária

### Notificação

* Listagem
* Marcar como lida

---

# 8. Fluxos de Negócio Obrigatórios

## 8.1 Fluxo Motorista

1. Cadastro.
2. Login.
3. Cadastro de veículo.
4. Criação de viagens.
5. Início de `ViagemDia`.
6. Busca de paradas.
7. Alteração de status de presença.
8. Alteração de status da viagem.

## 8.2 Fluxo Responsável

1. Cadastro.
2. Login.
3. Cadastro de dependentes.
4. Listagem de escolas.
5. Vinculação de escola.
6. Busca de viagens.
7. Criação de solicitação.
8. Monitoramento.
9. Encerramento de vínculo.

## 8.3 Fluxo Escola

1. Cadastro.
2. Login.

---

# 9. Regras de Sincronização de Dados

## Regra Geral

Após qualquer operação de escrita (`POST`, `PUT`, `DELETE`):

1. Usar a resposta retornada pela API para atualizar o estado local.
2. Quando necessário, reexecutar a consulta correspondente.
3. Atualizar a UI imediatamente.

---

## Exemplos

### Cadastro de Dependente

Após cadastrar:

* Atualizar a lista com a resposta do endpoint.

### Alterar Status de Presença

Após alteração:

* Substituir a lista de paradas pela lista retornada.

### Iniciar ViagemDia

Após iniciar:

* Obter `idViagemDia`.
* Navegar para tela de paradas.

---

# 10. Regras de Navegação

## Toda tela deve possuir:

* Botão Voltar.
* Botão Cancelar, quando aplicável.
* Navegação segura após sucesso.

## Nunca permitir:

* Tela sem botão de saída.
* Tela branca sem navegação.
* Fluxo sem retorno.

---

# 11. Auditoria de Navegação

A IA deve revisar todas as telas em `src/screens/` e validar:

1. Existe botão de retorno?
2. Existe navegação após sucesso?
3. Existe tratamento de erro?
4. Existe loading?

Se não existir, deve implementar.

---

# 12. Estados de UI

Toda tela que consome API deve possuir:

```ts
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<T | null>(null);
```

---

# 13. Tratamento de Erros

## Regras

* Capturar exceptions.
* Exibir mensagem amigável.
* Encerrar loading em `finally`.

### Exemplo

```ts
try {
  setLoading(true);
  const result = await service();
  setData(result);
} catch (e) {
  setError('Erro ao carregar dados.');
} finally {
  setLoading(false);
}
```

---

# 14. Persistência de Autenticação

O sistema deve armazenar:

* id do usuário
* tipoPerfil
* dados básicos

O fluxo deve restaurar a sessão ao reiniciar o aplicativo.

---

# 15. RootStackParamList

Toda rota deve estar tipada em:

```ts
src/navigation/index.ts
```

Toda navegação deve utilizar tipos corretos.

---

# 16. Telas Prioritárias para Correção

## Motorista

* Login
* Dashboard
* Cadastro de Veículo
* Cadastro de Viagem
* Iniciar Viagem
* Lista de Paradas

## Responsável

* Login
* Dashboard
* Cadastro de Dependente
* Lista de Escolas
* Vincular Escola
* Solicitações

## Escola

* Cadastro
* Login

---

# 17. Estratégia de Implementação

## Etapa 1 — Auditoria

* Ler documentação.
* Mapear endpoints.
* Mapear telas existentes.

## Etapa 2 — DTOs

* Criar interfaces TypeScript.

## Etapa 3 — Services

* Implementar todos os endpoints.

## Etapa 4 — Integração de Telas

* Substituir mocks por chamadas reais.

## Etapa 5 — Navegação

* Corrigir telas sem saída.

## Etapa 6 — Sincronização

* Atualizar estados após mutações.

## Etapa 7 — Testes Manuais

* Validar fluxos completos.

---

# 18. Remoção de Mocks

Se `authService.ts` ou outras telas utilizarem dados fictícios, a IA deve substituí-los por chamadas reais ao BackEnd.

---

# 19. Critérios de Aceitação

A implementação será considerada concluída quando:

1. Todos os endpoints estiverem implementados.
2. Nenhuma tela utilizar dados mockados.
3. Toda informação refletir o BackEnd.
4. Toda tela possuir saída.
5. Todos os fluxos de negócio funcionarem.
6. O TypeScript compilar sem erros.
7. A navegação estiver tipada.

---

# 20. Regras Arquiteturais Obrigatórias

* Não duplicar lógica de API dentro das telas.
* Não usar `fetch`; usar apenas Axios.
* Não deixar `any` desnecessário.
* Não manter dados mockados.
* Não criar rotas não tipadas.
* Reutilizar componentes existentes.
* Seguir o padrão visual atual.

---

# 21. Ordem Recomendada de Implementação

1. Types.
2. Services.
3. Auth.
4. Telas de Login.
5. Cadastros.
6. Listagens.
7. Fluxos de viagem.
8. Navegação.
9. Testes.

---

# 22. Resultado Esperado

Ao final da implementação:

* O aplicativo estará 100% integrado ao BackEnd.
* Todas as telas refletirão dados reais.
* Os fluxos seguirão as regras de negócio.
* O usuário nunca ficará preso em uma tela.
* O sistema estará preparado para expansão futura.
