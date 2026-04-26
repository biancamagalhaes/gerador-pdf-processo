# Automação de petições (monólito web)

Aplicação Node.js que:

- consulta processos na API pública do **Datajud** (TRF1);
- expõe um **catálogo com 10+ modelos** de petição selecionáveis na interface;
- gera **PDF** (Puppeteer) e **Word** (`.docx` via `html-to-docx`) a partir do **mesmo HTML** e do mesmo contexto de dados.

## Requisitos

- Node.js 18+
- Variável `DATAJUD_API_KEY` com a chave da API pública do CNJ

## Configuração

1. Copie `.env.example` para `.env` e preencha `DATAJUD_API_KEY`.
2. Opcional: `logo.png` e `footer.png` na raiz do projeto (imagens do cabeçalho/rodapé).

## Uso local

```bash
npm install
npm start
```

Abra `http://localhost:3000` (ou a porta definida em `PORT`).

O comando `npm start` executa [`index.js`](index.js), que sobe o Express e abre a porta HTTP; a API e os arquivos estáticos da pasta [`public/`](public/) ficam no mesmo host.

## Scripts

- `npm start` — sobe o servidor (API + SPA estática)
- `npm run lint` — ESLint
- `npm test` — testes (Node test runner)

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/templates` | Lista modelos disponíveis |
| POST | `/api/processos/consultar` | Corpo: `{ "numeroProcesso": "20 dígitos" }`. Resposta inclui `processo`, `inferencias` (por campo: `valor`, `confianca` = `certa` \| `provavel` \| `nenhuma`, `origem` opcional) e `sugestaoTemplate` (`templateIdSugerido`, `confianca`, `motivos`, `alternativas`). Na geração, apenas inferências `certa` preenchem automaticamente campos vazios no servidor. |
| POST | `/api/documentos/gerar` | Ver corpo abaixo |

**`POST /api/documentos/gerar`** — campos obrigatórios: `nomeCliente`, `numeroProcesso` (20 dígitos), `especialidade`, `templateId`.

Conforme o modelo (`camposUsuario` em `GET /api/templates`), podem ser obrigatórios também: `juizo` (opcional — se vazio, usa o órgão julgador do Datajud), `dataRemessaConclusao`, `idRecursoInominado`, `dataLaudoMedico`, `dataLaudoSocial`, `dataContestacao`, `dataReplica`. A interface em [`public/`](public/) exibe esses campos quando você seleciona o modelo.

Resposta de geração: JSON com `arquivos[]` contendo `conteudoBase64` para PDF e para Word (`.docx`).

## Deploy

Compatível com monólito em plataformas como **Render** (variáveis de ambiente + comando `npm start`). Em ambientes com memória limitada, monitore o uso do **Puppeteer**.

## Estrutura

- `src/server` — Express, rotas e controllers
- `src/services` — Datajud, templates, PDF, Word
- `src/templates` — catálogo e HTML dos modelos
- `public` — SPA leve (HTML/CSS/JS)
