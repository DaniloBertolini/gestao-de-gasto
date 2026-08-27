# Gestão de Gastos

App pessoal de controle de ganhos e gastos: login com JWT, dashboard com gráficos e lançamentos manuais de receitas/despesas.

## Stack

- **Backend:** NestJS 11 (Fastify) + Prisma + PostgreSQL, autenticação JWT (access + refresh rotativo).
- **Frontend:** React 19 + Vite, TanStack Query, react-hook-form + zod, Tailwind 4, Recharts.
- **Monorepo:** pnpm workspaces, com `packages/shared` compartilhando schemas zod entre API e front.

## Passar para alguém testar na própria máquina (sem instalar Node/pnpm)

Se é só pra alguém testar localmente (não é o fluxo de desenvolvimento), o jeito mais simples é `docker-compose.full.yml`: ele builda banco + API + site inteiros em containers, então quem for testar só precisa do **Docker Desktop** instalado — nada de Node, pnpm ou editar `.env`.

```bash
git clone <url-do-repositorio>
cd gestao-de-gasto
docker compose -f docker-compose.full.yml up --build
```

Primeira vez demora alguns minutos (builda tudo). Depois é só abrir **http://localhost:8080** no navegador, criar uma conta e usar. `Ctrl+C` derruba tudo; `docker compose -f docker-compose.full.yml up` (sem `--build`) nas próximas vezes já é rápido.

Os dados ficam guardados num volume Docker separado do seu ambiente de dev (não mistura com o Postgres que você usa no `pnpm dev`), então dá pra rodar os dois ao mesmo tempo sem conflito — só a porta 3000 é compartilhada pela API, então pare o `pnpm dev` antes se for testar essa stack na sua própria máquina.

## Setup local (para desenvolver)

### Pré-requisitos

- [Node.js 20+](https://nodejs.org) (o projeto foi feito com Node 22)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado e aberto
- pnpm — se não tiver, instale com `npm install -g pnpm` (o `corepack enable` do Node também funciona, mas em alguns ambientes Windows dá erro de permissão; `npm install -g pnpm` é o caminho mais confiável)
- Git, para clonar o repositório

### Passo a passo

```bash
# 0. Clonar o repositório e entrar na pasta
git clone <url-do-repositorio>
cd gestao-de-gasto

# 1. Instalar dependências
pnpm install

# 2. Buildar o pacote compartilhado (necessário antes de rodar api/web)
pnpm --filter @gestao/shared build

# 3. Subir o Postgres local
docker compose up -d

# 4. Configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# edite apps/api/.env e troque JWT_ACCESS_SECRET e JWT_REFRESH_PEPPER por strings aleatórias (32+ chars)

# 5. Rodar migrations + seed (cria usuário demo@gestao.local / senha12345 e categorias padrão)
pnpm --filter api prisma migrate dev
pnpm --filter api seed

# 6. Rodar em desenvolvimento (sobe o Postgres do Docker + API + front juntos)
pnpm dev
```

Acesse `http://localhost:5173`. A API sobe em `http://localhost:3000/api/v1` (`/health` para checar).

No dia a dia, depois desse setup inicial, é só abrir o Docker Desktop e rodar `pnpm dev` — ele já sobe o banco (se não estiver rodando), a API e o front juntos num só terminal. `Ctrl+C` derruba os três.

### Problemas comuns

- **`docker compose up` falha com erro de autenticação no Postgres**: geralmente é porta `5433` já ocupada por outro Postgres instalado na máquina (aconteceu em Windows com um Postgres nativo rodando como serviço). Verifique com `netstat -ano | grep 5433` (Windows) ou `lsof -i :5433` (Mac/Linux); se estiver ocupada, troque a porta em `docker-compose.yml` (ex: `"5434:5432"`) e ajuste `DATABASE_URL`/`DIRECT_URL` em `apps/api/.env` de acordo.
- **Erro `EPERM` ao rodar `prisma generate`/`migrate`**: normalmente é a API (`pnpm dev`) rodando em outro terminal e travando o arquivo do Prisma Client. Pare a API (`Ctrl+C`) antes de rodar comandos do Prisma manualmente.
- **`pnpm install` avisa sobre "Ignored build scripts"**: rode `pnpm approve-builds` e aprove `argon2`, `prisma` e `@prisma/client` (só precisa fazer isso uma vez).

## Estrutura

```
apps/api      # NestJS: auth, accounts, categories, transactions, reports
apps/web      # React + Vite: dashboard, transações, contas, categorias
packages/shared  # schemas zod + enums + helpers de dinheiro (BRL)
```

Dois arquivos de Docker Compose, propósitos diferentes:
- `docker-compose.yml` — só o Postgres, usado no dia a dia com `pnpm dev` (você roda API/front via Node direto, mais rápido pra desenvolver).
- `docker-compose.full.yml` — banco + API + site, tudo containerizado, pra alguém testar sem instalar nada além do Docker.

## Deploy em produção

Depois de publicado, ninguém mais precisa instalar nada localmente — é só acessar a URL do frontend pelo navegador e criar uma conta (a arquitetura já isola os dados por usuário). O "Setup local" acima só é necessário para quem for desenvolver/rodar o código na própria máquina.

Arquitetura recomendada, sem custo para começar:

| Peça | Onde | Por quê |
|---|---|---|
| Frontend (`apps/web`) | **Cloudflare Pages** | Estático, banda ilimitada grátis, uso comercial permitido |
| API (`apps/api`) | **Render** ou **Koyeb** (free tier, deploy via Docker) | Sobe a partir do `apps/api/Dockerfile` |
| Banco | **Neon** (Postgres serverless free tier) | Scale-to-zero sem apagar dados; dá connection string pooled + direta |

O `apps/api/Dockerfile` já está pronto e testado localmente (build + migrate + boot). O contexto do build **precisa ser a raiz do repo** (não `apps/api`), porque a API depende do pacote `packages/shared`.

### 1. Subir o código pro GitHub

Render e Koyeb fazem deploy a partir de um repositório Git. Se ainda não versionou:

```bash
git init
git add .
git commit -m "Setup inicial"
```

Depois crie um repositório vazio no GitHub e faça o push (`git remote add origin ...` + `git push`).

### 2. Banco — Neon

1. Crie uma conta em [neon.tech](https://neon.tech) e um novo projeto (região perto de você/dos usuários).
2. No dashboard do projeto, pegue duas connection strings:
   - **Pooled connection** (com `-pooler` no host) → vira `DATABASE_URL`
   - **Direct connection** (sem `-pooler`) → vira `DIRECT_URL` (só o Prisma Migrate usa)
3. Guarde as duas — vai colar na plataforma da API no próximo passo.

### 3. API — Render ou Koyeb

Ao criar o serviço, aponte para o repositório e configure:
- **Root Directory / contexto de build:** raiz do repo
- **Dockerfile path:** `apps/api/Dockerfile`
- **Porta:** 3000 (a plataforma injeta `PORT` automaticamente; a API já lê de `process.env.PORT`)

**Variáveis de ambiente a configurar na plataforma** (nunca no repositório):

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | connection string **pooled** do Neon |
| `DIRECT_URL` | connection string **direta** do Neon |
| `JWT_ACCESS_SECRET` | string aleatória ≥32 chars — gere com `openssl rand -base64 32` |
| `JWT_REFRESH_PEPPER` | outra string aleatória ≥32 chars (diferente da anterior) |
| `CORS_ORIGIN` | URL do frontend publicado (ex: `https://patrimonio.pages.dev`) — só dá pra preencher depois do passo 4 |

Depois do primeiro deploy, confira `https://sua-api.onrender.com/api/v1/health` → deve responder `{"status":"ok"}`.

### 4. Frontend — Cloudflare Pages

1. Crie um projeto em [pages.cloudflare.com](https://pages.cloudflare.com) conectado ao mesmo repositório.
2. Configuração de build:
   - **Root directory:** raiz do repo (não `apps/web`, senão ele não enxerga o `packages/shared`)
   - **Build command:** `pnpm run build:web`
   - **Output directory:** `apps/web/dist`
3. Variável de ambiente: `VITE_API_URL` = `https://sua-api.onrender.com/api/v1`

### 5. Fechar o ciclo

Frontend e API dependem da URL um do outro:
- Volte na plataforma da API e preencha `CORS_ORIGIN` com a URL real do Cloudflare Pages, depois faça redeploy.
- Se a URL da API mudar depois, atualize `VITE_API_URL` no Cloudflare Pages e faça redeploy do frontend.

### 6. Rodar as migrations

O `CMD` do container já roda `prisma migrate deploy` automaticamente antes de subir a API a cada deploy — não precisa rodar isso manualmente.

## Notas de segurança implementadas

- Senhas com argon2id, tokens JWT de acesso curtos (15 min) + refresh token rotativo com detecção de reuso.
- Todo acesso a dados é filtrado por `userId` (isolamento multi-tenant), nunca por `id` isolado.
- Rate limit em login/registro.

## Roadmap (fora do MVP atual)

Transferências entre contas, orçamento mensal por categoria, parcelamento/recorrência, fatura de cartão de crédito.
