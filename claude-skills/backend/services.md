# Skill: Service Layer Design

## Purpose
Encapsulate business logic in testable, reusable service modules.

## Rules

### Structure
- One service per domain entity or business capability
- Services are plain modules exporting functions (not classes, unless state is needed)
- Services call repositories/models — never import `req` or `res`
- Services can call other services, but avoid deep chains (max 2 levels)

### Service Responsibilities
- Validate business rules (not input format — that's the controller's job)
- Orchestrate multi-step operations (create user + send email + log audit)
- Apply authorization logic (can this user perform this action on this resource?)
- Transform data between layers (DB model -> API response shape)
- Manage transactions for atomic operations

### Pattern
```javascript
// services/clienteService.js
const { Cliente, Documento, sequelize } = require('../models');

async function createCliente(data, userId) {
  const transaction = await sequelize.transaction();
  try {
    const cliente = await Cliente.create(
      { ...data, created_by: userId },
      { transaction }
    );
    if (data.documentos) {
      await Documento.bulkCreate(
        data.documentos.map(d => ({ ...d, cliente_id: cliente.id })),
        { transaction }
      );
    }
    await transaction.commit();
    return cliente;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function findById(id, userId, userRole) {
  const cliente = await Cliente.findByPk(id, {
    include: ['documentos', 'imovel']
  });
  if (!cliente) return null;
  if (!userRole.is_administrador && cliente.corretor_id !== userId) {
    throw new AppError('Acesso negado', 403);
  }
  return cliente;
}

module.exports = { createCliente, findById };
```

### Rules
- Return plain data or model instances — never HTTP responses
- Throw typed errors (AppError subclasses) — let the controller catch and respond
- Accept only the data needed — don't pass the entire request object
- Keep service functions pure where possible (same input = same output)
- Document side effects (sends email, writes file, calls external API)
