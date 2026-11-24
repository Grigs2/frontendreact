# Contrato: upload e leitura das imagens dos documentos do motorista (front e back)

Status: rascunho para validação do back. Campos e rotas marcados como **proposta** ainda não existem.

## Fluxo

1. O motorista cria a conta (já existe).
2. Ele envia os dados de cada documento com `POST /Motorista/{id}/Documentos` (já existe). A resposta traz o `DocumentoMotoristaDTO` com `id` e status `PENDENTE`.
3. Para cada documento, envia a imagem com uma chamada própria, usando o `documentoId` retornado (**proposta**, seção Endpoints).
4. Quando é uma nova versão, o documento antigo é substituído (regra já existente). As imagens da versão antiga ficam ligadas a ela.
5. O administrador revisa o documento e vê as imagens na tela de revisão.

## Decisão de rotas

Recomendação: **uma rota parametrizada por `documentoId`**, não uma rota por tipo (`/CNH`, `/VISTORIA`, `/LICENCIAMENTO`).

- O tipo já está no documento. Uma rota por tipo repete código e permite enviar a imagem de uma CNH para um documento de vistoria.
- Cada documento continua tendo sua própria chamada, porque cada envio aponta para um `documentoId` diferente.
- O lado da imagem (`FRENTE`, `VERSO`, `UNICA`) vai no caminho, e o back valida se o lado combina com o tipo.

## Endpoints

### 1. Enviar imagem (proposta)

`POST /Motorista/{idMotorista}/Documentos/{documentoId}/Imagens/{lado}`

Autorização: motorista dono do documento.

Corpo: `multipart/form-data`, campo `arquivo` (binário).

| `lado` | Uso |
|---|---|
| `FRENTE` | CNH e licenciamento |
| `VERSO` | CNH e licenciamento |
| `UNICA` | Vistoria |

Resposta `200`:

```json
{
  "documentoId": 15,
  "lado": "FRENTE",
  "mimeType": "image/jpeg",
  "tamanhoBytes": 482133,
  "enviadoEm": "2026-11-24T10:20:00"
}
```

Enviar o mesmo `lado` de novo substitui a imagem, enquanto o documento não estiver `APROVADO`.

| Código | Situação |
|---|---|
| 200 | Imagem salva |
| 400 | `lado` não combina com o tipo do documento, ou arquivo ausente |
| 401 | sem token |
| 403 | documento de outro motorista |
| 404 | documento não encontrado |
| 409 | documento `APROVADO` (não aceita substituição; é preciso enviar nova versão) |
| 413 | arquivo acima do limite |
| 415 | formato não permitido |

### 2. Listar imagens de um documento (proposta)

`GET /Motorista/{idMotorista}/Documentos/{documentoId}/Imagens`

Autorização: motorista dono do documento ou ADMIN.

Retorna a lista de imagens enviadas (`lado`, `mimeType`, `tamanhoBytes`, `enviadoEm`). Não traz o conteúdo.

### 3. Baixar imagem (proposta)

`GET /Motorista/{idMotorista}/Documentos/{documentoId}/Imagens/{lado}`

`GET /Admin/Documentos/{documentoId}/Imagens/{lado}`

Autorização: motorista dono ou ADMIN. Escola e responsável não têm acesso.

Resposta: o binário da imagem, com `Content-Type` do arquivo e `Cache-Control: private, no-store`. Não existe URL pública fixa. O app envia o token no cabeçalho `Authorization`.

| Código | Situação |
|---|---|
| 200 | imagem |
| 401 / 403 / 404 | sem token, sem permissão ou imagem inexistente |

## Regras de negócio

**R1. Ordem.** A imagem só pode ser enviada para um `documentoId` existente. Não existe upload sem metadados.

**R2. Lados obrigatórios.**
- CNH e licenciamento: `FRENTE` e `VERSO` são obrigatórios para o documento ser revisado.
- Vistoria: `UNICA` é obrigatória.

**R3. Formato e tamanho.** Formatos permitidos: JPEG e PNG. Tamanho máximo: 1 MB por arquivo. A validação deve ser pelo conteúdo do arquivo (assinatura do binário), não só pela extensão.

**R4. Substituição.** Enquanto o documento estiver `PENDENTE` ou `RECUSADO`, um novo envio para o mesmo `lado` substitui a imagem anterior e apaga o arquivo antigo do disco. Depois de `APROVADO`, não substitui.

**R5. Nova versão.** As imagens pertencem ao `documentoId`. Ao enviar uma nova versão do documento, os arquivos da versão anterior são apagados do disco, e a nova versão começa sem imagens. Só a versão atual mantém arquivos no servidor. Os dados textuais da versão anterior permanecem.

**R6. Armazenamento.**
- Os arquivos ficam no disco do servidor, em caminho não público, por exemplo `{base}/motoristas/{idMotorista}/documentos/{documentoId}/{lado}`.
- Uma tabela de metadados guarda `documentoId`, `lado`, caminho, `mimeType`, `tamanhoBytes`, `sha256` e `enviadoEm`.
- O acesso ao caminho passa sempre pelo endpoint autenticado.
- O diretório base precisa de volume persistente no Docker (ver [RESUMO_PROJETO_PARA_IMPLEMENTACAO_DOCKER.md](docs/RESUMO_PROJETO_PARA_IMPLEMENTACAO_DOCKER.md)), senão as imagens somem ao recriar o container.

**R7. Criptografia (fase posterior).** Não entra agora. Para não refazer depois, o acesso aos arquivos deve passar por uma camada única de armazenamento. Assim a criptografia entra nessa camada, sem mudar os endpoints. Os arquivos já gravados precisarão de migração quando ela existir.

**R8. Auditoria.** Cada visualização de imagem pelo ADMIN registra quem viu, qual documento e quando.

**R9. Retenção.** Ao encerrar o vínculo do motorista, os arquivos e metadados de imagem dele são apagados em até 30 dias. Um job agendado diário remove os dados de motoristas encerrados há mais de 30 dias.

## Front (impacto)

- `documentoService`: `enviarImagem(idMotorista, documentoId, lado, arquivo)`, `listarImagens(...)`, `urlImagem(...)`.
- `DriverDocumentsScreen`: após o envio do documento, mostrar as etapas de imagem (CNH e licenciamento: frente e verso; vistoria: uma foto). Mostrar a imagem enviada com um toque.
- Para exibir a imagem com token, usar `Image` com `source={{ uri, headers: { Authorization } }}`. Isso funciona no Android, no iOS e no web.

## Onde mostrar para o ADMIN (sugestão)

Recomendação: **dentro da tela de Documentos do administrador** ([AdminDocumentsScreen.tsx](src/screens/AdminDocumentsScreen.tsx)), no cartão de cada documento, ao lado das conferências automáticas e dos botões de aprovar ou recusar.

Motivos:
- A decisão de aprovar acontece nessa tela, e a imagem precisa estar ao lado da conferência para o administrador comparar.
- A tela já agrupa os documentos por motorista.
- Um botão "Ver imagem" abre o arquivo em tela cheia, sem sair da revisão.

Outras opções, não recomendadas agora: uma tela separada de "Motoristas" no ADMIN, ou exibir as imagens no painel inicial.

## Limites de upload

- Spring: definir explicitamente `spring.servlet.multipart.max-file-size=1MB` e `max-request-size=2MB`. O limite de arquivo é validado no back e retorna `413`.
- Proxy reverso (nginx): `client_max_body_size 2m;`. O padrão de 1 MB rejeita arquivos perto do limite, porque o corpo inclui o cabeçalho do multipart, e a resposta sai antes de chegar ao Spring.

## Decisões confirmadas

1. PDF não é aceito. Somente JPEG e PNG.
2. Vistoria tem uma imagem (`UNICA`).
