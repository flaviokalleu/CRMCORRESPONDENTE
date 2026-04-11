# Skill: End-to-End Testing

## Purpose
Validate complete user workflows through the actual application interface.

## Rules

### Test Selection
- E2E tests are expensive — test critical user journeys only:
  - Login/logout flow
  - Create and manage a client (CRUD)
  - Payment processing flow
  - Document upload and viewing
  - Role-based access (admin vs. corretor vs. correspondente)
- Don't duplicate what unit/integration tests already cover

### Test Structure
```javascript
describe('Client Management', () => {
  beforeEach(() => {
    cy.login('admin@test.com', 'password123');
    cy.visit('/clientes');
  });

  it('should create a new client', () => {
    cy.get('[data-testid="btn-novo-cliente"]').click();
    cy.get('[data-testid="input-nome"]').type('João Silva');
    cy.get('[data-testid="input-cpf"]').type('12345678901');
    cy.get('[data-testid="input-email"]').type('joao@test.com');
    cy.get('[data-testid="btn-salvar"]').click();

    cy.get('[data-testid="toast-success"]').should('be.visible');
    cy.url().should('include', '/clientes/');
  });

  it('should search and filter clients', () => {
    cy.get('[data-testid="search-input"]').type('João');
    cy.get('[data-testid="client-row"]').should('have.length.greaterThan', 0);
    cy.get('[data-testid="client-row"]').first().should('contain', 'João');
  });
});
```

### Selectors
- Use `data-testid` attributes for test selectors — never rely on CSS classes or text content
- Convention: `data-testid="[action]-[element]"` (e.g., `btn-salvar`, `input-nome`, `modal-delete`)
- Add test IDs to components during development, not as an afterthought
- Never use fragile selectors like `.btn-primary:nth-child(3)`

### Reliability
- Wait for elements to be visible/interactive before acting — avoid fixed `cy.wait()`
- Use retry-able assertions: `should('be.visible')` not `expect(el).to.exist`
- Seed test data through the API, not through the UI
- Isolate tests: each test should start from a known state
- Handle loading states: wait for spinners to disappear before asserting

### CI Integration
- Run E2E tests in a dedicated CI stage after unit/integration pass
- Use headless browser mode in CI
- Capture screenshots/videos on failure for debugging
- Set reasonable timeouts (30s per test, 10min total suite)
- Retry flaky tests once before failing (but investigate the flakiness)
