# Frontend Next.js. Três etapas para a imagem final não conter nem o
# node_modules de desenvolvimento nem o código-fonte.

FROM node:24-alpine AS deps
WORKDIR /app
# Só o manifesto nesta camada: reinstalar dependência é lento e não deveria
# acontecer a cada mudança de componente.
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# API_URL é lida em tempo de execução pelas rotas de servidor, mas o build
# precisa de um valor para não falhar na análise estática das páginas.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup -g 10001 app && adduser -D -u 10001 -G app app

# `standalone` traz o servidor mínimo com só as dependências realmente
# importadas; static/ e public/ ficam fora dele e precisam ser copiados à parte.
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
