# Skill: Refactoring

## Purpose
Improve code structure without changing behavior, guided by clear signals and measurable goals.

## Rules

### When to Refactor
- Before adding a feature to code that's hard to extend
- When fixing a bug reveals deeper structural issues
- When a file exceeds 300 lines or a function exceeds 30 lines
- When the same pattern is copy-pasted 3+ times
- When tests are hard to write because of tight coupling

### When NOT to Refactor
- During an unrelated feature implementation (stay focused)
- Without tests covering the code you're changing
- Under time pressure with no safety net
- Code that works and won't be touched again
- For purely aesthetic preferences

### Safe Refactoring Process
1. Ensure tests pass before starting
2. Make one structural change at a time
3. Run tests after each change
4. Commit each step separately for easy revert
5. Verify behavior is unchanged

### Common Refactorings

**Extract Function**
```javascript
// Before: 30-line function with mixed concerns
async function handleCreateCliente(req, res) {
  // validate
  // create in DB
  // send email
  // log audit
}

// After: orchestrator calling focused functions
async function handleCreateCliente(req, res) {
  const data = validateClienteInput(req.body);
  const cliente = await clienteService.create(data, req.user.id);
  await emailService.sendWelcome(cliente.email);
  auditLog.record('cliente.created', { id: cliente.id, by: req.user.id });
  res.status(201).json({ data: cliente });
}
```

**Replace Conditional with Polymorphism**
```javascript
// Before: switch on role everywhere
if (user.is_administrador) { /* admin logic */ }
else if (user.is_corretor) { /* corretor logic */ }
else if (user.is_correspondente) { /* correspondente logic */ }

// After: strategy pattern
const dashboards = {
  administrador: DashboardAdministrador,
  corretor: DashboardCorretor,
  correspondente: DashboardCorrespondente
};
const Dashboard = dashboards[userRole];
```

**Extract Constants**
```javascript
// Before
if (attempts > 5) { /* ... */ }
setTimeout(retry, 30000);

// After
const MAX_LOGIN_ATTEMPTS = 5;
const RETRY_DELAY_MS = 30_000;
if (attempts > MAX_LOGIN_ATTEMPTS) { /* ... */ }
setTimeout(retry, RETRY_DELAY_MS);
```

### Metrics to Improve
- Cyclomatic complexity (reduce branching)
- Function length (under 30 lines)
- File length (under 300 lines)
- Parameter count (under 3, use objects beyond that)
- Nesting depth (under 3 levels)
