FROM node:20-alpine

# Instalar dependencias do sistema necessarias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_BIN=/usr/bin/chromium-browser

# Criar diretorio da aplicacao
WORKDIR /app

# Copiar arquivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar codigo fonte
COPY . .

# Criar diretorios necessarios
RUN mkdir -p uploads/clientes \
    uploads/fiador_documentos \
    uploads/formularios_caixa \
    uploads/temp \
    uploads/imagem_administrador \
    uploads/imoveis \
    uploads/laudos \
    whatsapp_sessions

# Expor porta
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/api/health || exit 1

# Comando para iniciar
CMD ["node", "src/server.js"]
