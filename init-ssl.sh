#!/bin/bash

# ============================================
# SCRIPT DE INICIALIZACAO SSL - CRM WEBBA
# ============================================
# Execute este script ANTES do docker-compose up

DOMAIN="crm.webba.site"
EMAIL="admin@webba.site"

echo "=========================================="
echo "  CRM WEBBA - Configuracao SSL"
echo "=========================================="

# Criar diretorios
mkdir -p certbot/conf
mkdir -p certbot/www

# Verificar se ja existe certificado
if [ -d "certbot/conf/live/$DOMAIN" ]; then
    echo "✅ Certificado ja existe para $DOMAIN"
    exit 0
fi

echo "🔧 Criando configuracao temporaria do Nginx..."

# Criar config temporaria sem SSL
cat > nginx-docker.conf << 'NGINXCONF'
server {
    listen 80;
    server_name crm.webba.site;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'CRM Webba - Aguardando SSL...';
        add_header Content-Type text/plain;
    }
}
NGINXCONF

echo "🚀 Iniciando containers temporarios..."
docker-compose up -d postgres redis backend frontend nginx-proxy

echo "⏳ Aguardando Nginx iniciar..."
sleep 10

echo "🔐 Gerando certificado SSL..."
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ Certificado gerado com sucesso!"

    # Restaurar config completa
    cat > nginx-docker.conf << 'NGINXCONF'
# Upstream servers
upstream frontend {
    server frontend:80;
}

upstream backend {
    server backend:8000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name crm.webba.site;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name crm.webba.site;

    ssl_certificate /etc/letsencrypt/live/crm.webba.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.webba.site/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    client_max_body_size 50M;

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXCONF

    echo "🔄 Reiniciando Nginx com SSL..."
    docker-compose restart nginx-proxy

    echo ""
    echo "=========================================="
    echo "  ✅ SSL CONFIGURADO COM SUCESSO!"
    echo "=========================================="
    echo "  Acesse: https://crm.webba.site"
    echo "=========================================="
else
    echo "❌ Falha ao gerar certificado"
    exit 1
fi
