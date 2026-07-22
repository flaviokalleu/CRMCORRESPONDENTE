// Gera uma key estável para listas React
export default function generateStableKey(prefix, item, index) {
  if (item && typeof item === 'object') {
    if (item.id) return `${prefix}-${item.id}`;
    if (item.key) return `${prefix}-${item.key}`;
    if (item.slug) return `${prefix}-${item.slug}`;
    if (item.name) return `${prefix}-${item.name.replace(/\s+/g, '-').toLowerCase()}`;
  }
  if (typeof item === 'string' || typeof item === 'number') {
    return `${prefix}-${item}`;
  }
  return `${prefix}-${index}-${Math.random().toString(36).substr(2, 9)}`;
}
