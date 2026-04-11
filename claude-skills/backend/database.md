# Skill: Database Management

## Purpose
Write efficient, safe, and maintainable database code with Sequelize and PostgreSQL.

## Rules

### Sequelize Models
- Define all columns explicitly in the model — don't rely on sync
- Use `underscored: true` for automatic snake_case column naming
- Define associations in model's `associate` static method
- Use scopes for commonly filtered queries (active, deleted, by-role)
- Always specify `tableName` explicitly to avoid pluralization surprises

### Migrations
- Every schema change goes through a migration — never use `sync({ alter: true })` in production
- Migrations must be reversible (`up` and `down` methods)
- Never modify a deployed migration — create a new one
- Use descriptive migration names: `20260411-add-status-to-imoveis.js`
- Test both `up` and `down` before committing

### Queries
- Use model methods (`findAll`, `findOne`, `create`, `update`, `destroy`)
- Include only needed associations with `attributes` and `include`
- Use `transaction` for multi-table operations that must be atomic
- Handle `valor_renda` as VARCHAR — cast to numeric for aggregations: `CAST("valor_renda" AS NUMERIC)`
- Use `findAndCountAll` for paginated endpoints

### Transactions
```javascript
const transaction = await sequelize.transaction();
try {
  await Cliente.create(data, { transaction });
  await Documento.bulkCreate(docs, { transaction });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

### Performance
- Add indexes on foreign keys and commonly queried columns
- Use `attributes` to select only needed columns
- Use `raw: true` for read-only queries that don't need model instances
- Avoid N+1: use `include` with `separate: true` for hasMany with limits
- Use `Op.in` for batch lookups instead of looping `findOne`

### Safety
- Never use `force: true` on `sync` in any environment
- Validate data types before passing to Sequelize (parse IDs as integers)
- Use soft deletes (`paranoid: true`) for business-critical data
- Back up before running destructive migrations
- Use `ON DELETE CASCADE` or `SET NULL` explicitly in foreign key definitions
