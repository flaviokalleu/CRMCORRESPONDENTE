# CRM IMOB — instruções do projeto

Monorepo com dois componentes: `backend-go` (API em Go/Gin/GORM + PostgreSQL) e
`frontend-next` (Next.js 16 + React 19 + Tailwind v4 + shadcn/ui). O
`frontend-next` tem regras próprias adicionais em `frontend-next/AGENTS.md`.

## Como rodar

```bash
# backend — porta 8001 (é o que frontend-next/.env.local espera em API_URL)
cd backend-go && go run ./cmd/api

# frontend
cd frontend-next && npm run dev
```

Atenção: `backend-go/.env` está com `PORT=8080`, desalinhado do `.env.example` e
do frontend, que usam 8001.

## Design de interface

As regras obrigatórias de UI (tokens, proibição de valores soltos, auditar antes
de corrigir, movimento por último) valem para todos os projetos e estão no
`CLAUDE.md` global, seção "Design de interface — regras obrigatórias".

Específico deste projeto:

- O design system já é **Tailwind v4 + shadcn/ui** — `reui.io/components` é do
  mesmo ecossistema e encaixa direto.
- A camada de tokens vive em `frontend-next/src/app/globals.css` e
  `frontend-next/src/app/crm-design.css`. Token novo entra ali, com nome, e só
  depois é usado.
