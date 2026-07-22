// hooks/useStableKey.js
import { useMemo } from 'react';

/**
 * Hook para gerar keys estáveis em listas React
 * Ajuda a prevenir problemas de reconciliação do Virtual DOM
 */
export const useStableKey = (prefix, item, index) => {
  return useMemo(() => {
    // Tenta usar uma propriedade única do item
    if (item && typeof item === 'object') {
      if (item.id) return `${prefix}-${item.id}`;
      if (item.key) return `${prefix}-${item.key}`;
      if (item.name) return `${prefix}-${item.name.replace(/\s+/g, '-').toLowerCase()}`;
      if (item.email) return `${prefix}-${item.email}`;
    }
    
    // Para valores primitivos
    if (typeof item === 'string' || typeof item === 'number') {
      return `${prefix}-${item}`;
    }
    
    // Último recurso: usar índice (menos ideal, mas melhor que keys instáveis)
    return `${prefix}-${index}`;
  }, [prefix, item, index]);
};

/**
 * Hook para gerar keys de lista estáveis
 */
export const useStableListKeys = (prefix, items) => {
  return useMemo(() => {
    return items.map((item, index) => {
      if (item && typeof item === 'object') {
        if (item.id) return `${prefix}-${item.id}`;
        if (item.key) return `${prefix}-${item.key}`;
        if (item.name) return `${prefix}-${item.name.replace(/\s+/g, '-').toLowerCase()}`;
      }
      
      if (typeof item === 'string' || typeof item === 'number') {
        return `${prefix}-${item}`;
      }
      
      return `${prefix}-${index}`;
    });
  }, [prefix, items]);
};
