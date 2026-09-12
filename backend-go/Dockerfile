# API em Go. Duas etapas: compila numa imagem com toolchain, roda numa imagem
# mínima que só tem o binário.

FROM golang:1.26-alpine AS build
WORKDIR /src

# Baixar os módulos antes de copiar o código deixa esta camada em cache: só
# muda quando go.mod/go.sum mudam, não a cada edição de arquivo .go.
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# CGO desligado: pdfcpu, imaging e minio-go são Go puro, então o binário sai
# estático e roda numa imagem sem libc. `-trimpath` e `-s -w` tiram caminhos de
# build e tabela de símbolos, que não servem em produção e só engordam.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/migrar-storage ./cmd/migrar-storage
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/migrar-documentos ./cmd/migrar-documentos

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata wget && \
    adduser -D -u 10001 app
WORKDIR /app

COPY --from=build /out/api /app/api
COPY --from=build /out/migrar-storage /app/migrar-storage
COPY --from=build /out/migrar-documentos /app/migrar-documentos
# As migrations viajam junto para poder rodar `migrate` contra o banco do
# compose sem precisar do repositório na VPS.
COPY migrations /app/migrations

# Volume para as pastas que ainda vivem no disco (imagens de imóvel, logo do
# tenant, avatar). Documentos de cliente vão para o S3, não para cá.
ENV UPLOADS_DIR=/data/uploads
RUN mkdir -p /data/uploads && chown -R app:app /data

USER app
EXPOSE 8001

# O contêiner é considerado saudável quando a API responde; o compose usa isso
# para só liberar o proxy depois que ela subiu de verdade.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8001/api/health || exit 1

CMD ["/app/api"]
