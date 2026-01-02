#!/bin/bash

# ============================================
# SCRIPT DE DEPLOY - CRM WEBBA
# ============================================

set -e

echo "=========================================="
echo "  CRM WEBBA - Deploy Script"
echo "=========================================="

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar se docker esta instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker nao encontrado. Instale o Docker primeiro.${NC}"
    exit 1
fi

# Verificar se docker-compose esta instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose nao encontrado. Instale o Docker Compose primeiro.${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/5] Parando containers existentes...${NC}"
docker-compose down 2>/dev/null || true

echo -e "${YELLOW}[2/5] Construindo imagens...${NC}"
docker-compose build --no-cache

echo -e "${YELLOW}[3/5] Iniciando containers...${NC}"
docker-compose up -d

echo -e "${YELLOW}[4/5] Aguardando servicos...${NC}"
sleep 10

echo -e "${YELLOW}[5/5] Verificando status...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}=========================================="
echo "  Deploy concluido com sucesso!"
echo "=========================================="
echo ""
echo "  Portas:"
echo "  - Frontend: http://localhost:3847"
echo "  - Backend:  http://localhost:8847"
echo "  - Postgres: localhost:5847"
echo "  - Redis:    localhost:6847"
echo ""
echo "  Comandos uteis:"
echo "  - Ver logs: docker-compose logs -f"
echo "  - Parar: docker-compose down"
echo "  - Reiniciar: docker-compose restart"
echo "==========================================${NC}"
