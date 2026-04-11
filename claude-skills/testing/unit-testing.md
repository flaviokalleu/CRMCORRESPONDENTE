# Skill: Unit Testing

## Purpose
Write fast, isolated, reliable unit tests that verify individual functions and components.

## Rules

### Test Structure (AAA Pattern)
```javascript
describe('ClienteService', () => {
  describe('createCliente', () => {
    it('should create a client with valid data', async () => {
      // Arrange
      const data = { nome: 'João Silva', cpf: '12345678901', email: 'joao@test.com' };
      jest.spyOn(Cliente, 'create').mockResolvedValue({ id: 1, ...data });

      // Act
      const result = await ClienteService.createCliente(data, userId);

      // Assert
      expect(result).toMatchObject({ nome: 'João Silva' });
      expect(Cliente.create).toHaveBeenCalledWith(
        expect.objectContaining({ nome: 'João Silva' }),
        expect.any(Object)
      );
    });

    it('should throw ValidationError when CPF is missing', async () => {
      const data = { nome: 'João Silva' };
      await expect(ClienteService.createCliente(data, userId))
        .rejects.toThrow(ValidationError);
    });
  });
});
```

### Naming Conventions
- Describe block: name of the module/function under test
- It block: `should [expected behavior] when [condition]`
- Test file: `[module].test.js` colocated with the source file or in `__tests__/`
- All test descriptions in English (code comments can be Portuguese)

### Isolation Rules
- Mock external dependencies (database, APIs, file system)
- Each test must be independent — no shared mutable state between tests
- Use `beforeEach` for setup, `afterEach` for teardown
- Reset all mocks after each test: `jest.restoreAllMocks()` in `afterEach`
- Never test implementation details — test behavior and outputs

### What to Test
- Happy path: correct input produces correct output
- Edge cases: empty input, null, undefined, boundary values
- Error cases: invalid input throws appropriate error
- Business rules: authorization, validation, state transitions
- Return values and side effects (was the right function called?)

### What NOT to Test
- Framework internals (React rendering, Express routing)
- Third-party library behavior
- Trivial getters/setters with no logic
- Private implementation details
- Database schema (that's migration testing)

### Coverage
- Aim for 80% line coverage on business logic (services, utils)
- Don't chase 100% — diminishing returns past 80%
- Coverage measures lines executed, not correctness — write meaningful assertions
- Use `/* istanbul ignore next */` sparingly for genuinely unreachable code
