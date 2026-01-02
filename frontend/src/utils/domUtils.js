// utils/domUtils.js
/**
 * Utilitários para manipulação segura do DOM no React
 * Ajuda a prevenir erros como "removeChild: Node to be removed is not a child of this node"
 * Especialmente importante quando ferramentas de tradução modificam o DOM
 */

import { AnimatePresence } from 'framer-motion';
import React from 'react';

/**
 * Remove um elemento do DOM de forma segura
 * @param {HTMLElement} element - Elemento a ser removido
 */
export const safeRemoveElement = (element) => {
  if (element && element.parentNode) {
    try {
      // Verifica se o elemento ainda está conectado ao DOM
      if (element.isConnected !== false && element.parentNode.contains(element)) {
        element.parentNode.removeChild(element);
      }
    } catch (error) {
      console.warn('Erro ao remover elemento do DOM (ignorado):', error.message);
    }
  }
};

/**
 * Verifica se um elemento ainda está conectado ao DOM
 * @param {HTMLElement} element - Elemento a ser verificado
 * @returns {boolean}
 */
export const isElementConnected = (element) => {
  return element && 
         element.isConnected !== false && 
         element.parentNode && 
         element.parentNode.contains(element);
};

/**
 * Proteção global contra erros de DOM causados por ferramentas de tradução
 */
export const setupDOMProtection = () => {
  // Intercepta erros de removeChild
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    try {
      if (this.contains(child)) {
        return originalRemoveChild.call(this, child);
      } else {
        console.warn('Tentativa de remoção de nó que não é filho - ignorada');
        return child;
      }
    } catch (error) {
      console.warn('Erro em removeChild interceptado:', error.message);
      return child;
    }
  };

  // Intercepta erros de insertBefore
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    try {
      if (!referenceNode || this.contains(referenceNode)) {
        return originalInsertBefore.call(this, newNode, referenceNode);
      } else {
        console.warn('Tentativa de inserção com referência inválida - ignorada');
        return this.appendChild(newNode);
      }
    } catch (error) {
      console.warn('Erro em insertBefore interceptado:', error.message);
      return newNode;
    }
  };

  console.log('✅ Proteção DOM ativada contra ferramentas de tradução');
};

/**
 * Hook personalizado para limpeza segura de elementos DOM
 */
export const useSafeCleanup = () => {
  const cleanupCallbacks = [];

  const addCleanup = (callback) => {
    cleanupCallbacks.push(callback);
  };

  const cleanup = () => {
    cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Erro durante limpeza (ignorado):', error.message);
      }
    });
    cleanupCallbacks.length = 0;
  };

  return { addCleanup, cleanup };
};

/**
 * Gera keys únicas e estáveis para listas React
 * @param {string} prefix - Prefixo para a key
 * @param {*} item - Item da lista
 * @param {number} index - Índice do item
 * @returns {string}
 */
export const generateStableKey = (prefix, item, index) => {
  // Tenta usar uma propriedade única do item (como id)
  if (item && typeof item === 'object') {
    if (item.id) return `${prefix}-${item.id}`;
    if (item.key) return `${prefix}-${item.key}`;
    if (item.name) return `${prefix}-${item.name.replace(/\s+/g, '-').toLowerCase()}`;
  }
  
  // Fallback para string ou valores primitivos
  if (typeof item === 'string' || typeof item === 'number') {
    return `${prefix}-${item}`;
  }
  
  // Último recurso: usar índice (menos ideal)
  return `${prefix}-${index}`;
};

/**
 * Wrapper para AnimatePresence que previne erros de DOM
 */
export const SafeAnimatePresence = ({ children, ...props }) => {
  return (
    <AnimatePresence mode="wait" {...props}>
      {children}
    </AnimatePresence>
  );
};

/**
 * Componente wrapper que protege contra erros de DOM
 */
export const DOMProtectedWrapper = ({ children, className, ...props }) => {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const element = ref.current;
    if (element) {
      // Adiciona atributos para prevenir tradução automática
      element.setAttribute('translate', 'no');
      element.classList.add('notranslate');
    }
  }, []);

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
};

/**
 * Hook para proteger componentes contra modificações do DOM
 */
export const useDOMProtection = () => {
  React.useEffect(() => {
    setupDOMProtection();
  }, []);
};
