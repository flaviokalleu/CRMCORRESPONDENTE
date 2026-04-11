# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CRM IMOB — Real estate CRM for brokers and correspondents in Valparaíso de Goiás, Brazil. Full-stack SPA with role-based access (Administrador, Correspondente, Corretor), WhatsApp integration, payment processing (Mercado Pago), document management, and analytics dashboards.

## Commands

### Development
```bash
# Backend (runs on port 8000)
cd backend && npm start                    # node src/server.js

# Frontend (runs on port 3000)
cd frontend && npm start                   # react-scripts start

# Database
cd backend && npx sequelize db:migrate --config src/config/database.js
cd backend && npx sequelize db:seed:all --config src/config/database.js

# Frontend build (includes obfuscation)
cd frontend && npm run build

# Docker (production)
docker-compose up -d
```

### Database
- PostgreSQL 15, default DB name: `crmjs`, port 5432 (dev) / 5847 (docker)
- ORM: Sequelize 6 with migrations in `backend/src/migrations/`
- Models auto-loaded from `backend/src/models/` via `models/index.js`
- Config: `backend/src/config/database.js` — uses `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` env vars
- Column naming: underscored (`created_at`, not `createdAt`)

## Architecture

### Backend (`backend/src/`)
- **Entry:** `server.js` — Express + Socket.io, CORS, 18+ route imports
- **Auth flow:** JWT (1h) + refresh token (7d) stored in `Token` model. Middleware `authenticateToken.js` verifies Bearer token against both JWT signature and Token table, sets `req.user`
- **Routes:** 30+ files in `routes/` — largest are `clientes.js` (63KB), `pagamentos.js` (66KB), `dashboardRoutes.js` (29KB), `configuracao.js` (29KB)
- **Models:** 25+ Sequelize models. Key: `User` (role flags: `is_corretor`, `is_administrador`, `is_correspondente`), `Cliente` (massive — financial, personal, documents, spouse, guarantor fields), `Imovel`, `Pagamento`, `Aluguel`
- **Services:** `mercadoPagoService.js` (payments), `pdfService.js` (44KB, PDF/image conversion), `whatsappRoutes.js` (Baileys WhatsApp Web), `emailService.js` (Nodemailer SMTP)
- **File uploads:** Multer, stored in `backend/uploads/` organized by type (clientes, imagem_administrador, corretor, etc.)

### Frontend (`frontend/src/`)
- **Stack:** React 18, Tailwind CSS, Framer Motion, Material-UI, Recharts, Axios
- **Routing:** `App.js` — route guards: `ProtectedRoute`, `AdminOnlyRoute`, `PublicRoute`
- **Auth:** `context/AuthContext.jsx` — stores JWT in localStorage (`authToken`, `refreshToken`), periodic check every 5min, auto-logout on 401/403
- **Layout:** `layouts/MainLayout.jsx` wraps authenticated pages with `Sidebar` + content area
- **Dashboard:** `components/Dashboard.jsx` routes to role-specific dashboards (`DashboardAdministrador`, `DashboardCorretor`, `DashboardCorrespondente`) via lazy loading
- **Landing page:** `pages/LandingPage.jsx` composes components from `components/landpage/`
- **Real-time:** Socket.io client in `context/SocketContext.jsx`

### Design System (Tailwind)
- **Color tokens** defined in `tailwind.config.js` under `caixa.*`:
  - `caixa-primary`: `#0B1426` (navy), `caixa-secondary`: `#162a4a`
  - `caixa-orange`: `#F97316` (accent), `caixa-light`: `#F97316`
  - `bg-caixa-gradient`: navy gradient used on dashboard/sidebar backgrounds
- **Fonts:** Plus Jakarta Sans (body), Cormorant Garamond (serif headings on landing page)
- Dashboard uses dark theme (navy gradient). Landing page alternates dark sections with ivory `#FAF7F2` sections.

### Role System
Users have boolean flags (`is_administrador`, `is_correspondente`, `is_corretor`) — a user can have multiple roles simultaneously. The `hasRole()` function in AuthContext checks these flags. Menu items, routes, and dashboard views are filtered by role.

### Key Integration Points
- **WhatsApp:** `routes/whatsappRoutes.js` uses `@whiskeysockets/baileys` — QR code pairing, session persistence in files, message sending
- **Payments:** `services/mercadoPagoService.js` — boleto, PIX, credit card via Mercado Pago SDK
- **AI:** Google Generative AI (Gemini) for client analysis features

## Environment Variables

### Backend (`backend/.env`)
`PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET_KEY`, `MERCADO_PAGO_ACCESS_TOKEN`, `FRONTEND_URL`, `GEMINI_API_KEY`

### Frontend (`frontend/.env`)
`REACT_APP_API_URL` (e.g. `http://localhost:8000/api`), `REACT_APP_SOCKET_URL`, `REACT_APP_NOME_SISTEMA`, `REACT_APP_WHATSAPP_NUMBER`

## Gotchas

- The `valor_renda` field on `Cliente` model is `VARCHAR`, not numeric — any SQL aggregations (AVG, SUM) require `CAST("valor_renda" AS NUMERIC)`.
- Sidebar component defines sub-components inside the render function — this causes React to remount them every render. If refactoring, move `NavItem` and `DropdownSection` outside.
- The token timer in Sidebar updates state every second; avoid adding `logout`/`navigate` functions directly as useEffect dependencies (use refs instead) or the interval will restart infinitely.
- WhatsApp Baileys reconnection has a 5-attempt limit with exponential backoff. Error 405 means the connection is blocked and should not retry.
- File upload paths differ by user role: `imagem_administrador/`, `imagem_correspondente/`, `corretor/`, `imagem_user/`.
- All text content is in Brazilian Portuguese.

## Skills Reference

Behavioral rules and coding guidelines are in `claude-skills/`. Consult them when working on related tasks:

| Folder | When to use |
|---|---|
| `core/` | Token optimization (economia máxima), diagramação de telas, clean architecture, code quality, performance |
| `security/` | Auth, input validation, secrets, OWASP compliance |
| `backend/` | API design, database/Sequelize, error handling, services |
| `frontend/` | React patterns, UI/Tailwind, state management, frontend perf |
| `automation/` | Workflow automation, scripts, CI triggers |
| `testing/` | Unit, integration, E2E tests, mocking strategies |
| `devops/` | Docker, CI/CD, monitoring, infrastructure |
| `ai/` | AI integration, prompt engineering, data processing |
| `advanced/` | Debugging, refactoring, profiling, migrations, code review |
