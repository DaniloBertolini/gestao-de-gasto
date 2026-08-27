# Build com contexto na raiz do monorepo:
#   docker build -f apps/api/Dockerfile -t patrimonio-api .
# É assim que Render/Koyeb devem ser configurados (root directory = raiz do repo,
# dockerfile path = apps/api/Dockerfile), porque a API depende do pacote
# workspace @gestao/shared, que não existe fora do monorepo.

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
# O install falha "duro" na primeira vez por causa de dependências com script
# de build (argon2, prisma) ainda não aprovadas — aprova e reconstrói em seguida.
RUN pnpm install --frozen-lockfile --filter @gestao/shared --filter api || true
RUN pnpm approve-builds --all
RUN pnpm rebuild

COPY packages/shared packages/shared
COPY apps/api apps/api
# Defesa extra: garante que nenhum .env de dev sobreviva na imagem, mesmo se
# vazar por engano do .dockerignore.
RUN find . -maxdepth 3 -name ".env" -not -name "*.example" -delete

RUN pnpm --filter @gestao/shared build
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

FROM node:22-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production

# Copia o monorepo inteiro já construído (node_modules incluído) — mantém
# os symlinks do pnpm intactos, o que é frágil de reconstruir manualmente.
COPY --from=build /repo ./

WORKDIR /repo/apps/api
EXPOSE 3000

# Aplica migrations pendentes e só então sobe a API.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]
