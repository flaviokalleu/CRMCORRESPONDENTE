# Deploy na VPS

Stack completa em contêiner: Postgres, MinIO, API, frontend e Caddy com TLS
automático. Só as portas 80 e 443 ficam abertas — banco e storage existem apenas
na rede interna do compose.

## Antes de subir

1. **Aponte o DNS** do domínio para o IP da VPS. O Caddy só consegue emitir o
   certificado se o Let's Encrypt alcançar o domínio na porta 80; sem isso ele
   fica em ciclo de tentativa e o site não abre.
2. **Instale Docker** com o plugin compose (`docker compose version` precisa
   responder).
3. **Libere 80 e 443** no firewall da VPS.

## Subir

```bash
git clone <repo> crm && cd crm
cp .env.example .env
```

Preencha o `.env`. As senhas não têm valor padrão de propósito — um segredo
padrão em produção é o mesmo que não ter segredo:

```bash
openssl rand -base64 24   # DB_PASSWORD
openssl rand -hex 32      # JWT_SECRET_KEY
openssl rand -hex 32      # JWT_REFRESH_SECRET_KEY
openssl rand -hex 16      # S3_ACCESS_KEY
openssl rand -hex 16      # S3_SECRET_KEY
```

```bash
docker compose up -d --build
docker compose logs -f caddy   # acompanhe a emissão do certificado
```

A ordem é garantida pelo compose: o Postgres precisa estar saudável, o serviço
`migrate` roda as migrations e sai, e só então a API sobe. Se as migrations
falharem, a API não sobe — o deploy quebra de forma visível, em vez de a
aplicação subir contra um banco desatualizado e errar numa coluna inexistente
mais tarde.

## O que vai para onde

| Conteúdo | Destino | Motivo |
|---|---|---|
| Documentos de cliente | MinIO (`crm-uploads`) | Volume grande, precisa de backup próprio |
| Imagem de imóvel, logo do tenant, avatar | Volume `uploadsdata` | Servidos como estáticos públicos |
| Banco | Volume `pgdata` | — |
| Certificados | Volume `caddydata` | Preserva o certificado entre deploys |

Documento de cliente **nunca** é servido direto pelo MinIO. O navegador pede à
API, que confere sessão e tenant e então transmite os bytes. É por isso que o
MinIO não tem porta pública: uma URL de documento não vale nada fora da sessão.

O console do MinIO fica em `127.0.0.1:9001`, acessível só por túnel:

```bash
ssh -L 9001:localhost:9001 usuario@vps    # depois abra http://localhost:9001
```

## Migrar de uma instalação que já rodava em disco

Se você já tem documentos gravados no sistema de arquivos:

```bash
# 1) copie a pasta uploads/ para a VPS, em ./uploads
# 2) com a stack no ar, envie os arquivos ao bucket
docker compose run --rm \
  -v "$PWD/uploads:/data/uploads" \
  api /app/migrar-storage -n      # simula
docker compose run --rm \
  -v "$PWD/uploads:/data/uploads" \
  api /app/migrar-storage         # executa
```

O comando é idempotente: objeto já presente no destino com o mesmo tamanho é
pulado, então rodar de novo é seguro. Os PDFs consolidados não são copiados de
propósito — são cache derivado e se remontam sozinhos no primeiro acesso.

## Atualizar

```bash
git pull
docker compose up -d --build
```

Migrations novas rodam sozinhas antes da API voltar.

## Backup

Três coisas precisam de cópia; as duas primeiras são as que doem perder:

```bash
# banco
docker compose exec -T postgres pg_dump -U "$DB_USERNAME" "$DB_NAME" | gzip > banco-$(date +%F).sql.gz

# documentos (espelha o bucket para uma pasta local)
docker compose run --rm minio-init sh -c \
  'mc alias set local http://minio:9000 $S3_ACCESS_KEY $S3_SECRET_KEY && mc mirror local/$S3_BUCKET /backup'

# arquivos que ainda vivem em volume
docker run --rm -v crm_uploadsdata:/dados -v "$PWD:/saida" alpine \
  tar czf /saida/uploads-$(date +%F).tar.gz -C /dados .
```

## Variáveis de storage

A API escolhe onde guardar documento por `STORAGE_DRIVER`:

| Valor | Efeito |
|---|---|
| `local` (padrão) | Disco, em `UPLOADS_DIR`. É o que vale em desenvolvimento — `go run ./cmd/api` funciona sem subir MinIO. |
| `s3` | MinIO ou qualquer S3, configurado por `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_USE_SSL`. |

Para apontar a um S3 externo (Amazon, Backblaze) em vez do MinIO local, troque
essas variáveis e remova os serviços `minio` e `minio-init` do compose. O código
é o mesmo — a única diferença é `S3_USE_SSL=true` e o endpoint do provedor.

## Rodar contra MinIO sem Docker (desenvolvimento)

```bash
minio server ./miniodata --address 127.0.0.1:9100

cd backend-go
STORAGE_DRIVER=s3 S3_ENDPOINT=127.0.0.1:9100 \
S3_ACCESS_KEY=... S3_SECRET_KEY=... S3_BUCKET=crm-uploads S3_USE_SSL=false \
go run ./cmd/api
```

A API cria o bucket no boot se ele não existir.
