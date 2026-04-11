# Skill: Integration Testing

## Purpose
Verify that components work together correctly, especially database and API interactions.

## Rules

### API Integration Tests
```javascript
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');

beforeAll(async () => {
  await sequelize.sync({ force: true });
  // Seed test data
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/clientes', () => {
  it('should create a client and return 201', async () => {
    const response = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        nome: 'Maria Santos',
        cpf: '98765432100',
        email: 'maria@test.com'
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.nome).toBe('Maria Santos');

    // Verify in database
    const cliente = await Cliente.findByPk(response.body.data.id);
    expect(cliente).not.toBeNull();
  });

  it('should return 401 without auth token', async () => {
    const response = await request(app)
      .post('/api/clientes')
      .send({ nome: 'Test' });

    expect(response.status).toBe(401);
  });

  it('should return 400 with invalid data', async () => {
    const response = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${testToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
```

### Database Integration Tests
- Use a separate test database (e.g., `crmjs_test`)
- Run migrations before test suite, truncate tables between tests
- Use transactions with rollback for test isolation when possible
- Test actual queries, not mocked results
- Verify cascade deletes, unique constraints, and foreign keys

### Test Environment
- Set `NODE_ENV=test` to use test configuration
- Use environment-specific database credentials
- Disable external service calls (WhatsApp, Mercado Pago) — use mocks
- Run with `--runInBand` to prevent parallel DB conflicts
- Clean up all test data after the suite completes

### What to Test
- Complete request/response cycles (HTTP method, status code, body)
- Authentication and authorization on each endpoint
- Data persistence (create, read, update, delete)
- Business rule enforcement through the API
- Error responses for invalid requests
- Pagination, filtering, and sorting parameters

### Performance
- Keep integration tests under 30 seconds total
- Use `beforeAll` for expensive setup (DB sync), not `beforeEach`
- Batch seed data creation
- Run integration tests separately from unit tests in CI
