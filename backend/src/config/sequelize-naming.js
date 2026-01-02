module.exports = {
  defaultIndexName: (table, attributes) => {
    return `idx_${table}_${attributes.join('_')}`;
  },
  
  primaryKeyIndexName: (table) => {
    return `pk_${table}`;
  },
  
  foreignKeyIndexName: (table, attributes) => {
    return `fk_${table}_${attributes.join('_')}`;
  },
  
  uniqueIndexName: (table, attributes) => {
    return `unq_${table}_${attributes.join('_')}`;
  }
};