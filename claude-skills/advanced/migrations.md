# Skill: Database Migrations

## Purpose
Evolve database schema safely with zero-downtime deployments and reversible changes.

## Rules

### Migration Principles
- Every schema change must be a migration — no manual SQL in production
- Migrations must be reversible: implement both `up` and `down`
- Never modify a migration that has been deployed — create a new one
- Test migrations against a copy of production data before deploying
- Back up the database before running destructive migrations

### Safe Migration Patterns

**Adding a column (safe)**
```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('clientes', 'observacoes', {
      type: Sequelize.TEXT,
      allowNull: true,      // Always nullable for new columns
      defaultValue: null
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('clientes', 'observacoes');
  }
};
```

**Renaming a column (requires coordination)**
```javascript
// Step 1: Add new column, backfill, update code to write both
// Step 2: Switch code to read from new column
// Step 3: Drop old column in a later migration
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('clientes', 'telefone_principal', {
      type: Sequelize.STRING
    });
    await queryInterface.sequelize.query(
      'UPDATE clientes SET telefone_principal = telefone'
    );
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('clientes', 'telefone_principal');
  }
};
```

**Adding an index (safe, can be slow)**
```javascript
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('clientes', ['corretor_id'], {
      name: 'idx_clientes_corretor_id',
      concurrently: true  // PostgreSQL: non-blocking index creation
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('clientes', 'idx_clientes_corretor_id');
  }
};
```

### Dangerous Operations (require extra care)
- **Dropping a column**: Ensure no code references it. Deploy code change first, then migrate.
- **Changing column type**: May lose data. Add new column, migrate data, drop old.
- **Adding NOT NULL**: Add as nullable first, backfill, then add constraint.
- **Dropping a table**: Ensure all foreign keys are removed first.

### Naming Convention
```
YYYYMMDDHHMMSS-descriptive-action.js

20260411120000-add-observacoes-to-clientes.js
20260411130000-create-audit-log-table.js
20260411140000-add-index-on-corretor-id.js
```

### Pre-Migration Checklist
- [ ] `down` migration tested and works
- [ ] No code depends on removed/renamed columns
- [ ] Large table changes tested with production-sized data
- [ ] Database backed up
- [ ] Team notified of schema change
- [ ] Migration runs within acceptable downtime window
