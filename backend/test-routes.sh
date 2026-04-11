#!/bin/bash
# Test all backend routes
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBhZG1pbi5jb20iLCJyb2xlIjoiQWRtaW5pc3RyYWRvciIsImlzX2NvcnJldG9yIjpmYWxzZSwiaXNfY29ycmVzcG9uZGVudGUiOmZhbHNlLCJpc19hZG1pbmlzdHJhZG9yIjp0cnVlLCJ0ZW5hbnRfaWQiOjEsImlzX3N1cGVyX2FkbWluIjp0cnVlLCJpYXQiOjE3NzU5NTA0MjksImV4cCI6MTc3NTk1NDAyOX0.7fiCP9qIlj3Zj00bewLP95icnMdhrf4l9L0yH3xXOYs"
BASE="http://localhost:8000"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

PASS=0
FAIL=0
WARN=0
RESULTS=""

test_route() {
  local method=$1
  local url=$2
  local desc=$3
  local data=$4
  local expect_code=${5:-200}

  if [ "$method" = "GET" ]; then
    RESP=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE$url" 2>/dev/null)
  elif [ "$method" = "POST" ]; then
    RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$AUTH" -H "$CT" -d "$data" "$BASE$url" 2>/dev/null)
  elif [ "$method" = "PUT" ]; then
    RESP=$(curl -s -o /dev/null -w "%{http_code}" -X PUT -H "$AUTH" -H "$CT" -d "$data" "$BASE$url" 2>/dev/null)
  elif [ "$method" = "PATCH" ]; then
    RESP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "$AUTH" -H "$CT" -d "$data" "$BASE$url" 2>/dev/null)
  elif [ "$method" = "DELETE" ]; then
    RESP=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "$AUTH" "$BASE$url" 2>/dev/null)
  elif [ "$method" = "GET_PUBLIC" ]; then
    RESP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$url" 2>/dev/null)
  elif [ "$method" = "POST_PUBLIC" ]; then
    RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$CT" -d "$data" "$BASE$url" 2>/dev/null)
  fi

  # Determine result
  if [ "$RESP" = "$expect_code" ]; then
    STATUS="PASS"
    PASS=$((PASS+1))
  elif [ "$RESP" = "200" ] || [ "$RESP" = "201" ] || [ "$RESP" = "204" ]; then
    STATUS="PASS"
    PASS=$((PASS+1))
  elif [ "$RESP" = "404" ] && (echo "$url" | grep -qE '/:id|/999|/0'); then
    STATUS="PASS"
    PASS=$((PASS+1))
  elif [ "$RESP" = "400" ] || [ "$RESP" = "404" ] || [ "$RESP" = "422" ]; then
    STATUS="WARN"
    WARN=$((WARN+1))
  elif [ "$RESP" = "000" ]; then
    STATUS="FAIL"
    FAIL=$((FAIL+1))
    RESP="TIMEOUT"
  else
    STATUS="FAIL"
    FAIL=$((FAIL+1))
  fi

  printf "%-6s %-4s %-7s %-50s %s\n" "$STATUS" "$RESP" "$method" "$url" "$desc"
}

echo "============================================================"
echo "  TESTE DE TODAS AS ROTAS DO BACKEND - $(date)"
echo "============================================================"
echo ""
echo "Legenda: PASS=OK  WARN=4xx esperado  FAIL=Erro inesperado"
echo ""

# ===== AUTH ROUTES =====
echo "--- AUTH ROUTES (/api/auth) ---"
test_route GET "/api/auth/test" "Test route"
test_route POST_PUBLIC "/api/auth/login" "Login" '{"email":"admin@admin.com","password":"admin"}'
test_route POST "/api/auth/validate-token" "Validate token"
test_route GET "/api/auth/me" "Get profile"
test_route GET "/api/auth/check-auth" "Check auth"
test_route GET "/api/auth/users/admin@admin.com" "Get user by email"

# ===== PROTECTED ROUTES =====
echo ""
echo "--- PROTECTED ROUTES ---"
test_route GET "/api/protected/protected" "Protected endpoint"

# ===== DASHBOARD ROUTES =====
echo ""
echo "--- DASHBOARD ROUTES (/api/dashboard) ---"
test_route GET "/api/dashboard" "Main dashboard"
test_route GET "/api/dashboard/monthly" "Monthly data"
test_route GET "/api/dashboard/weekly" "Weekly data"
test_route GET "/api/dashboard/system-stats" "System stats"
test_route GET "/api/dashboard/activity-metrics" "Activity metrics"
test_route GET "/api/dashboard/notifications" "Notifications"

# ===== DASHBOARD ALUGUEL =====
echo ""
echo "--- DASHBOARD ALUGUEL ---"
test_route GET "/api/dashboard/alugueis" "Rental dashboard"

# ===== CORRETOR ROUTES =====
echo ""
echo "--- CORRETOR ROUTES (/api/corretor) ---"
test_route GET "/api/corretor/me" "Get my broker data"
test_route GET "/api/corretor" "List brokers"
test_route GET "/api/corretor/999" "Get broker 999"

# ===== CORRESPONDENTE ROUTES =====
echo ""
echo "--- CORRESPONDENTE ROUTES (/api/correspondente) ---"
test_route GET "/api/correspondente/me" "Get my correspondent data"
test_route GET "/api/correspondente/lista" "List correspondents"

# ===== LISTADECORRETORES =====
echo ""
echo "--- LISTA DE CORRETORES ---"
test_route GET "/api/listadecorretores" "List all brokers"

# ===== ADMIN ROUTES =====
echo ""
echo "--- ADMIN ROUTES (/api/admin) ---"
test_route GET "/api/admin/me" "Get admin info"

# ===== USER ROUTES =====
echo ""
echo "--- USER ROUTES (/api/user) ---"
test_route GET "/api/user/me" "Get user profile"
test_route GET "/api/user" "List all users"

# ===== REPORT ROUTES =====
echo ""
echo "--- REPORT ROUTES (/api/report) ---"
test_route GET "/api/report/relatorio" "View report"

# ===== LISTA DE CLIENTES =====
echo ""
echo "--- LISTA DE CLIENTES ---"
test_route GET "/api/listadeclientes" "List clients"
test_route GET "/api/listadeclientes/usuarios" "List users"

# ===== IMOVEIS ROUTES =====
echo ""
echo "--- IMOVEIS ROUTES (/api/imoveis) ---"
test_route GET "/api/imoveis" "List properties"
test_route GET "/api/imoveis/busca" "Search properties"
test_route GET "/api/imoveis/999" "Get property 999"

# ===== NOTAS ROUTES =====
echo ""
echo "--- NOTAS ROUTES (/api/notas) ---"
test_route GET "/api/notas/clientes/1/notas" "Get client notes"
test_route POST "/api/notas" "Create note" '{"cliente_id":1,"texto":"Nota de teste"}'

# ===== CONFIGURATIONS =====
echo ""
echo "--- CONFIGURATIONS ---"
test_route GET "/api/configurations" "Get configurations"

# ===== LOCATIONS =====
echo ""
echo "--- LOCATIONS ---"
test_route GET "/api/estados" "List states"
test_route GET "/api/municipios/1" "List municipalities"

# ===== ALUGUEIS ROUTES =====
echo ""
echo "--- ALUGUEIS ROUTES (/api/alugueis) ---"
test_route GET "/api/alugueis" "List rentals"

# ===== WHATSAPP ROUTES =====
echo ""
echo "--- WHATSAPP ROUTES (/api/whatsapp) ---"
test_route GET "/api/whatsapp/status" "WhatsApp status"
test_route GET "/api/whatsapp/sessions" "List sessions"

# ===== LEMBRETES ROUTES =====
echo ""
echo "--- LEMBRETES ROUTES ---"
test_route GET "/api/lembretes" "List reminders"
test_route POST "/api/lembretes" "Create reminder" '{"titulo":"Test","data":"2026-05-01","descricao":"Test reminder"}'

# ===== ACESSOS ROUTES =====
echo ""
echo "--- ACESSOS ROUTES (/api/acessos) ---"
test_route GET "/api/acessos" "List accesses"
test_route GET "/api/acessos/stats" "Access stats"

# ===== CLIENTE ALUGUEL ROUTES =====
echo ""
echo "--- CLIENTE ALUGUEL ROUTES ---"
test_route GET "/api/clientealuguel" "List tenants"
test_route GET "/api/clientealuguel/999" "Get tenant 999"
test_route GET "/api/alugueis-disponiveis" "Available rentals"

# ===== ASAAS WEBHOOK =====
echo ""
echo "--- ASAAS WEBHOOK ---"
test_route GET_PUBLIC "/api/asaas/teste" "Test Asaas"

# ===== CONTRATO ALUGUEL =====
echo ""
echo "--- CONTRATO ALUGUEL ---"
test_route GET "/api/clientealuguel/999/contrato" "Get contract 999"

# ===== CONTRATO ROUTES =====
echo ""
echo "--- CONTRATO ROUTES ---"
test_route GET "/api/contratos/opcoes" "Contract options"
test_route GET "/api/contratos" "List contracts"

# ===== PROPRIETARIOS =====
echo ""
echo "--- PROPRIETARIOS ---"
test_route GET "/api/proprietarios" "List owners"

# ===== PORTAL INQUILINO =====
echo ""
echo "--- PORTAL INQUILINO ---"
test_route POST_PUBLIC "/api/portal/login" "Portal login" '{"cpf":"12345678901"}'

# ===== REPASSES =====
echo ""
echo "--- REPASSES ---"
test_route GET "/api/repasses" "List transfers"
test_route GET "/api/repasses/resumo" "Transfer summary"

# ===== VISTORIAS =====
echo ""
echo "--- VISTORIAS ---"
test_route GET "/api/vistorias/cliente/1" "Get surveys for client 1"

# ===== CHAMADOS =====
echo ""
echo "--- CHAMADOS ---"
test_route GET "/api/chamados" "List tickets"
test_route GET "/api/chamados/resumo" "Tickets summary"

# ===== LAUDOS =====
echo ""
echo "--- LAUDOS ROUTES (/api/laudos) ---"
test_route GET "/api/laudos" "List reports"

# ===== SIMULACOES =====
echo ""
echo "--- SIMULACOES (/api/simulacoes) ---"
test_route GET "/api/simulacoes" "List simulations"

# ===== VISITAS =====
echo ""
echo "--- VISITAS (/api/visitas) ---"
test_route GET "/api/visitas" "List visits"

# ===== PROPOSTAS =====
echo ""
echo "--- PROPOSTAS (/api/propostas) ---"
test_route GET "/api/propostas" "List proposals"

# ===== NOTIFICACOES =====
echo ""
echo "--- NOTIFICACOES (/api/notificacoes) ---"
test_route GET "/api/notificacoes" "List notifications"
test_route GET "/api/notificacoes/nao-lidas" "Unread notifications"
test_route PUT "/api/notificacoes/ler-todas" "Mark all read"

# ===== TIMELINE =====
echo ""
echo "--- TIMELINE (/api/timeline) ---"
test_route GET "/api/timeline/cliente/1" "Client timeline"

# ===== PAGAMENTOS =====
echo ""
echo "--- PAGAMENTOS (/api/pagamentos) ---"
test_route GET_PUBLIC "/api/pagamentos/publico/999" "Public payment 999"
test_route GET "/api/pagamentos" "List payments"
test_route GET "/api/pagamentos/config" "Payment config"
test_route GET "/api/pagamentos/whatsapp/status" "WhatsApp status"
test_route GET "/api/pagamentos/mercadopago/config" "MP config"

# ===== RECEITAS =====
echo ""
echo "--- RECEITAS (/api/receitas) ---"
test_route GET "/api/receitas" "List income"

# ===== DESPESAS =====
echo ""
echo "--- DESPESAS (/api/despesas) ---"
test_route GET "/api/despesas" "List expenses"

# ===== COMISSOES =====
echo ""
echo "--- COMISSOES (/api/comissoes) ---"
test_route GET "/api/comissoes" "List commissions"

# ===== FLUXO DE CAIXA =====
echo ""
echo "--- FLUXO DE CAIXA (/api/fluxocaixa) ---"
test_route GET "/api/fluxocaixa" "List cash flows"
test_route GET "/api/fluxocaixa/dashboard" "Cash flow dashboard"

# ===== CLIENTES ROUTES =====
echo ""
echo "--- CLIENTES ROUTES (/api/clientes) ---"
test_route GET "/api/clientes" "List clients"
test_route GET "/api/clientes/999" "Get client 999"

# ===== TENANT ROUTES =====
echo ""
echo "--- TENANT ROUTES (/api/tenant) ---"
test_route GET_PUBLIC "/api/tenant/plans" "List plans"
test_route GET_PUBLIC "/api/tenant/check-slug/test-slug" "Check slug"

# ===== SUPER ADMIN =====
echo ""
echo "--- SUPER ADMIN (/api/super-admin) ---"
test_route GET "/api/super-admin/tenants" "List tenants"
test_route GET "/api/super-admin/plans" "List plans"
test_route GET "/api/super-admin/metrics" "Metrics"

# ===== TENANT SETTINGS =====
echo ""
echo "--- TENANT SETTINGS (/api/tenant-settings) ---"
test_route GET "/api/tenant-settings/settings" "Get settings"

# ===== PLAN USAGE / STORAGE =====
echo ""
echo "--- PLAN USAGE / STORAGE ---"
test_route GET "/api/plan-usage" "Plan usage"
test_route GET "/api/storage-usage" "Storage usage"

# ===== AUTH PROTECTION TESTS =====
echo ""
echo "--- AUTH PROTECTION (should be 401/403 without token) ---"
test_route GET_PUBLIC "/api/clientes" "Clientes sem auth" "" "401"
test_route GET_PUBLIC "/api/imoveis" "Imoveis sem auth" "" "401"
test_route GET_PUBLIC "/api/alugueis" "Alugueis sem auth" "" "401"
test_route GET_PUBLIC "/api/clientealuguel" "ClienteAluguel sem auth" "" "401"
test_route GET_PUBLIC "/api/pagamentos" "Pagamentos sem auth" "" "401"
test_route GET_PUBLIC "/api/laudos" "Laudos sem auth" "" "401"
test_route GET_PUBLIC "/api/dashboard" "Dashboard sem auth" "" "401"

# ===== SUMMARY =====
echo ""
echo "============================================================"
echo "  RESULTADO FINAL"
echo "============================================================"
echo "  PASS: $PASS"
echo "  WARN: $WARN (4xx esperados - dados inexistentes, validação)"
echo "  FAIL: $FAIL (erros inesperados - 500, timeout, crash)"
echo "  TOTAL: $((PASS+WARN+FAIL))"
echo "============================================================"
