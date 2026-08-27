# Build com contexto na raiz do monorepo:
#   docker build -f apps/web/Dockerfile -t patrimonio-web .
# (precisa ser a raiz porque o front depende do pacote workspace @gestao/shared)

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @gestao/shared --filter web || true
RUN pnpm approve-builds --all
RUN pnpm rebuild

COPY packages/shared packages/shared
COPY apps/web apps/web
RUN find . -maxdepth 3 -name ".env*" -not -name "*.example" -delete

RUN pnpm --filter @gestao/shared build

# URL da API que o front vai chamar — em teste local dos dois no mesmo Docker
# Compose isso é resolvido via variável de build (ver docker-compose.full.yml).
ARG VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter web build

FROM nginx:1.27-alpine AS runner
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
