import React, { useEffect, useRef } from 'react';
import { generateStableKey } from '../utils/domUtils';

/**
 * Lista protegida contra erros de DOM causados por ferramentas de tradução
 */
export const SafeList = ({ 
  items, 
  renderItem, 
  keyPrefix = 'item',
  className = '',
  ...props 
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      // Adiciona proteções específicas para listas
      container.setAttribute('translate', 'no');
      container.classList.add('notranslate');
    }
  }, []);

  if (!Array.isArray(items)) {
    return null;
  }

  return (
    <div ref={containerRef} className={className} {...props}>
      {items.map((item, index) => {
        const stableKey = generateStableKey(keyPrefix, item, index);
        
        return (
          <div key={stableKey} data-stable-key={stableKey}>
            {renderItem(item, index)}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Componente de tabela protegida contra erros de DOM
 */
export const SafeTable = ({ 
  children, 
  className = '',
  ...props 
}) => {
  const tableRef = useRef(null);

  useEffect(() => {
    const table = tableRef.current;
    if (table) {
      table.setAttribute('translate', 'no');
      table.classList.add('notranslate');
      
      // Proteção adicional para elementos de tabela
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        row.setAttribute('translate', 'no');
      });
    }
  }, [children]);

  return (
    <table ref={tableRef} className={className} {...props}>
      {children}
    </table>
  );
};

/**
 * Modal protegido contra erros de DOM
 */
export const SafeModal = ({ 
  isOpen, 
  onClose, 
  children, 
  className = '',
  ...props 
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (modal && isOpen) {
      modal.setAttribute('translate', 'no');
      modal.classList.add('notranslate');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      className={`fixed inset-0 z-50 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Hook para proteger componentes específicos
 */
export const useTranslationProtection = (elementRef) => {
  useEffect(() => {
    const element = elementRef.current;
    if (element) {
      // Adiciona proteções contra tradução
      element.setAttribute('translate', 'no');
      element.classList.add('notranslate');
      
      // Proteção adicional para elementos filhos críticos
      const criticalElements = element.querySelectorAll('input, button, [data-critical]');
      criticalElements.forEach(el => {
        el.setAttribute('translate', 'no');
        el.classList.add('notranslate');
      });
    }
  }, [elementRef]);
};

export default {
  SafeList,
  SafeTable,
  SafeModal,
  useTranslationProtection
};
