#!/bin/sh
set -e

echo "=========================================="
echo "  CRM BACKEND - INICIALIZACAO"
echo "=========================================="

echo "🔧 Gerando arquivo .env..."

# Criar arquivo .env
cat > /app/.env << EOF
# ============================================
# CONFIGURACOES DO SERVIDOR (AUTO-GERADO)
# ============================================
PORT=${PORT:-8000}
NODE_ENV=${NODE_ENV:-production}
BASE_URL=${BASE_URL:-http://localhost:8000}
BACKEND_URL=${BACKEND_URL:-http://localhost:8000}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}

# ============================================
# BANCO DE DADOS - POSTGRESQL
# ============================================
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-crm}
DB_USERNAME=${DB_USERNAME:-postgres}
DB_PASSWORD=${DB_PASSWORD:-}

# ============================================
# SEGURANCA & AUTENTICACAO
# ============================================
JWT_SECRET_KEY=${JWT_SECRET_KEY:-your_jwt_secret_key_here}

# ============================================
# INTELIGENCIA ARTIFICIAL - GEMINI
# ============================================
GEMINI_API_KEY=${GEMINI_API_KEY:-}

# ============================================
# WHATSAPP - BAILEYS INTEGRATION
# ============================================
WHATSAPP_BASE_URL=${WHATSAPP_BASE_URL:-http://localhost:8000/api/whatsapp}
WHATSAPP_COUNTRY_CODE=${WHATSAPP_COUNTRY_CODE:-55}
WHATSAPP_PHONE_LENGTH=${WHATSAPP_PHONE_LENGTH:-12}
DEFAULT_PHONE_NUMBER=${DEFAULT_PHONE_NUMBER:-}

# ============================================
# MERCADO PAGO - PAGAMENTOS
# ============================================
MERCADO_PAGO_ACCESS_TOKEN=${MERCADO_PAGO_ACCESS_TOKEN:-}
MERCADO_PAGO_PUBLIC_KEY=${MERCADO_PAGO_PUBLIC_KEY:-}

# ============================================
# CONFIGURACOES DE PAGAMENTO
# ============================================
MAX_PARCELAS=${MAX_PARCELAS:-12}
BOLETO_DAYS_TO_EXPIRE=${BOLETO_DAYS_TO_EXPIRE:-7}
PIX_EXPIRE_MINUTES=${PIX_EXPIRE_MINUTES:-30}

# ============================================
# REDIS
# ============================================
REDIS_URL=${REDIS_URL:-redis://localhost:6379}

# ============================================
# CONFIGURACOES DE UPLOAD
# ============================================
MAX_FILE_SIZE=${MAX_FILE_SIZE:-5242880}
ALLOWED_FILE_TYPES=${ALLOWED_FILE_TYPES:-jpg,jpeg,png,pdf,doc,docx}

# ============================================
# NOTIFICACOES
# ============================================
NOTIFICATION_ENABLED=${NOTIFICATION_ENABLED:-true}
EMAIL_NOTIFICATIONS=${EMAIL_NOTIFICATIONS:-true}
WHATSAPP_NOTIFICATIONS=${WHATSAPP_NOTIFICATIONS:-true}
EOF

echo "✅ Arquivo .env criado!"

# Aguardar o banco de dados estar pronto
echo "⏳ Aguardando banco de dados em ${DB_HOST}:${DB_PORT:-5432}..."

max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if nc -z ${DB_HOST} ${DB_PORT:-5432} 2>/dev/null; then
        echo "✅ Banco de dados disponível!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Tentativa $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Timeout aguardando banco de dados!"
    exit 1
fi

# Aguardar mais um pouco para o banco estar pronto para conexoes
sleep 3

# Rodar migrations automaticamente
echo "🔄 Executando migrations..."
if npx sequelize-cli db:migrate --config src/config/database.js --migrations-path src/migrations 2>/dev/null; then
    echo "✅ Migrations executadas com sucesso!"
else
    echo "⚠️ Migrations falharam ou já estão atualizadas"
fi

# Rodar seeds se for a primeira vez (opcional)
if [ "${RUN_SEEDS:-false}" = "true" ]; then
    echo "🌱 Executando seeds..."
    if npx sequelize-cli db:seed:all --config src/config/database.js --seeders-path src/seeders 2>/dev/null; then
        echo "✅ Seeds executados com sucesso!"
    else
        echo "⚠️ Seeds falharam ou já foram executados"
    fi
fi

echo "=========================================="
echo "  INICIANDO SERVIDOR"
echo "=========================================="
echo "📋 Configurações:"
echo "   NODE_ENV: ${NODE_ENV:-production}"
echo "   DB_HOST: ${DB_HOST}"
echo "   DB_NAME: ${DB_NAME}"
echo "   PORT: ${PORT:-8000}"
echo "=========================================="

# Executar comando passado
exec "$@"
