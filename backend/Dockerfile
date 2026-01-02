FROM node:20-alpine

# Instalar dependencias do sistema
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
    ttf-freefont \
    netcat-openbsd \
    bash

# Configurar Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_BIN=/usr/bin/chromium-browser

# Criar diretorio da aplicacao
WORKDIR /app

# Copiar arquivos de dependencias primeiro (para cache)
COPY package*.json ./
COPY .sequelizerc ./

# Instalar TODAS as dependencias (incluindo dev para sequelize-cli)
RUN npm install

# Copiar todo o codigo fonte
COPY . .

# Criar diretorios necessarios
RUN mkdir -p uploads/clientes \
    uploads/fiador_documentos \
    uploads/formularios_caixa \
    uploads/temp \
    uploads/imagem_administrador \
    uploads/imagem_correspondente \
    uploads/imoveis \
    uploads/laudos \
    uploads/corretor \
    uploads/usuario \
    whatsapp_sessions

# Converter line endings e dar permissao ao entrypoint
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Expor porta
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/api/health || exit 1

# Usar entrypoint customizado
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Comando para iniciar
CMD ["node", "src/server.js"]
