#!/bin/sh
set -e

echo "=========================================="
echo "  CRM BACKEND - INICIALIZACAO"
echo "=========================================="

# Criar arquivo .env na raiz do app
echo "🔧 Gerando arquivo .env..."
cat > /app/.env << ENVEOF
PORT=${PORT:-8000}
NODE_ENV=${NODE_ENV:-production}
BASE_URL=${BASE_URL:-http://localhost:8000}
BACKEND_URL=${BACKEND_URL:-http://localhost:8000}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-crm}
DB_USERNAME=${DB_USERNAME:-postgres}
DB_PASSWORD=${DB_PASSWORD:-}
JWT_SECRET_KEY=${JWT_SECRET_KEY:-your_jwt_secret_key_here}
GEMINI_API_KEY=${GEMINI_API_KEY:-}
WHATSAPP_BASE_URL=${WHATSAPP_BASE_URL:-http://localhost:8000/api/whatsapp}
MERCADO_PAGO_ACCESS_TOKEN=${MERCADO_PAGO_ACCESS_TOKEN:-}
MERCADO_PAGO_PUBLIC_KEY=${MERCADO_PAGO_PUBLIC_KEY:-}
REDIS_URL=${REDIS_URL:-redis://localhost:6379}
ENVEOF

echo "✅ Arquivo .env criado!"

# Aguardar o banco de dados
echo "⏳ Aguardando PostgreSQL em ${DB_HOST}:${DB_PORT:-5432}..."
until nc -z "${DB_HOST}" "${DB_PORT:-5432}"; do
    echo "   Aguardando..."
    sleep 2
done
echo "✅ PostgreSQL acessível!"

# Aguardar PostgreSQL estar pronto para conexões
sleep 5

# Executar migrations
echo ""
echo "🔄 Executando migrations..."
cd /app
npx sequelize-cli db:migrate --env production 2>&1 || echo "⚠️ Algumas migrations podem ter falhado"

# Rodar seeds se solicitado
if [ "${RUN_SEEDS}" = "true" ]; then
    echo "🌱 Executando seeds..."
    npx sequelize-cli db:seed:all --env production 2>&1 || echo "⚠️ Alguns seeds podem ter falhado"
fi

echo ""
echo "=========================================="
echo "🚀 INICIANDO SERVIDOR NA PORTA ${PORT:-8000}"
echo "=========================================="

exec "$@"
