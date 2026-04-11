# Skill: API Design

## Purpose
Build consistent, predictable, and well-structured REST APIs.

## Rules

### URL Structure
- Use nouns for resources: `/api/clientes`, not `/api/getClientes`
- Use plural nouns: `/api/imoveis`, not `/api/imovel`
- Nest for relationships: `/api/clientes/:id/documentos`
- Maximum 2 levels of nesting — beyond that, use query params or top-level endpoints
- Use kebab-case for multi-word paths: `/api/tipo-imovel`

### HTTP Methods
- `GET` — read (safe, idempotent), never mutate state
- `POST` — create new resource
- `PUT` — full replacement of resource
- `PATCH` — partial update of specific fields
- `DELETE` — remove resource (idempotent)

### Status Codes
- `200` — success with body
- `201` — resource created (include `Location` header)
- `204` — success with no body (delete, update)
- `400` — validation error (include field-level details)
- `401` — not authenticated
- `403` — authenticated but not authorized
- `404` — resource not found
- `409` — conflict (duplicate, state violation)
- `422` — semantically invalid request
- `500` — unexpected server error (log it, return generic message)

### Response Format
```json
{
  "data": {},
  "message": "optional human-readable message",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Response Format
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Dados inválidos",
  "details": [
    { "field": "email", "message": "Email é obrigatório" }
  ]
}
```

### Pagination
- Default page size: 20, max: 100
- Support `?page=1&limit=20` query parameters
- Always return total count and total pages in response
- Use cursor-based pagination for large datasets or real-time feeds

### Versioning
- Use URL path versioning when breaking changes are needed: `/api/v2/clientes`
- Don't version until you actually need multiple versions running simultaneously

### Request Handling
- Parse request body once in the controller, pass plain objects to services
- Validate request body/params/query before any business logic
- Support filtering via query params: `?status=ativo&corretor_id=5`
- Support sorting: `?sort=created_at&order=desc`
