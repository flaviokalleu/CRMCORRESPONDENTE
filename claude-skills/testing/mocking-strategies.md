# Skill: Mocking Strategies

## Purpose
Use test doubles effectively to isolate units under test without over-mocking.

## Rules

### When to Mock
- External services (WhatsApp API, Mercado Pago, email, Gemini AI)
- Database calls in unit tests (not in integration tests)
- File system operations
- Time-dependent code (`Date.now`, `setTimeout`)
- Non-deterministic values (random IDs, UUIDs)

### When NOT to Mock
- The code under test itself
- Simple utility functions with no side effects
- Data transformations and business logic
- Database in integration tests — use a real test database

### Jest Mock Patterns
```javascript
// Module mock
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ sent: true })
}));

// Spy on existing method
jest.spyOn(Cliente, 'findByPk').mockResolvedValue({ id: 1, nome: 'Test' });

// Manual mock for complex dependencies
// __mocks__/mercadoPagoService.js
module.exports = {
  createPayment: jest.fn().mockResolvedValue({ id: 'PAY-123', status: 'approved' }),
  getPayment: jest.fn().mockResolvedValue({ id: 'PAY-123', status: 'approved' })
};

// Timer mocks
jest.useFakeTimers();
jest.advanceTimersByTime(5000);
jest.useRealTimers();

// Restore after each test
afterEach(() => {
  jest.restoreAllMocks();
});
```

### Mock Data Factories
```javascript
// test/factories.js
function buildCliente(overrides = {}) {
  return {
    id: 1,
    nome: 'Cliente Teste',
    cpf: '12345678901',
    email: 'teste@test.com',
    status: 'ativo',
    created_at: new Date('2026-01-01'),
    ...overrides
  };
}

function buildUser(overrides = {}) {
  return {
    id: 1,
    nome: 'Admin Teste',
    email: 'admin@test.com',
    is_administrador: true,
    is_corretor: false,
    is_correspondente: false,
    ...overrides
  };
}

module.exports = { buildCliente, buildUser };
```

### Rules
- Mock at the boundary, not deep inside the dependency chain
- Each mock should have a realistic shape matching the real return type
- Use factory functions to create test data with sensible defaults and overrides
- Verify mock calls: `expect(mock).toHaveBeenCalledWith(expectedArgs)`
- Don't mock what you don't own — wrap third-party libraries in your own interfaces
- Reset mocks between tests to prevent state leakage
