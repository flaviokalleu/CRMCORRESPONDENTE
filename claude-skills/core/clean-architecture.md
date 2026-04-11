# Skill: Clean Architecture

## Purpose
Enforce separation of concerns, dependency inversion, and maintainable code structure.

## Rules

### Layer Separation
- **Controllers/Routes**: HTTP concerns only — parse request, call service, return response
- **Services**: Business logic — no direct DB queries, no HTTP objects (`req`, `res`)
- **Repositories/Models**: Data access only — no business rules, no formatting
- **Utils/Helpers**: Pure functions with no side effects, no external dependencies

### Dependency Direction
- Dependencies point inward: routes -> services -> repositories -> models
- Never import a route file from a service
- Never import Express/HTTP types in business logic layers
- Use dependency injection or factory patterns to decouple layers

### File Organization
- One primary export per file (one model, one service, one controller)
- Group by feature/domain, not by technical layer, when the project exceeds 20 files per layer
- Index files for re-exports only — no logic in `index.js`
- Keep files under 300 lines; split when approaching this limit

### Naming Conventions
- Files: `kebab-case.js` or match existing project convention
- Classes/Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Database columns: `snake_case`
- Boolean variables: prefix with `is`, `has`, `can`, `should`

### SOLID Principles
- **Single Responsibility**: Each function does one thing. If you need "and" to describe it, split it.
- **Open/Closed**: Extend behavior through composition, not modification of existing functions
- **Liskov Substitution**: Subtypes must be substitutable for their base types
- **Interface Segregation**: Don't force consumers to depend on methods they don't use
- **Dependency Inversion**: High-level modules depend on abstractions, not concrete implementations

### Anti-Patterns to Avoid
- God objects/files that handle everything
- Circular dependencies between modules
- Business logic in middleware or route handlers
- Hardcoded configuration values — use environment variables
- Deep nesting (more than 3 levels) — extract helper functions
