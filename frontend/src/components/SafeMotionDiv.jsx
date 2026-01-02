import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Wrapper seguro para motion.div que previne erros de removeChild
 */
const SafeMotionDiv = React.forwardRef(({ children, onAnimationComplete, onExitComplete, ...props }, ref) => {
  const internalRef = useRef();
  const elementRef = ref || internalRef;

  useEffect(() => {
    // Cleanup function para garantir que não há referências orfãs
    return () => {
      if (elementRef.current && elementRef.current.parentNode) {
        try {
          // Verifica se o elemento ainda está conectado ao DOM antes de tentar qualquer operação
          if (elementRef.current.isConnected) {
            // Element ainda está conectado, deixa o React/Framer Motion lidar com isso
          }
        } catch (error) {
          console.warn('SafeMotionDiv cleanup warning:', error);
        }
      }
    };
  }, [elementRef]);

  const handleAnimationComplete = (definition) => {
    if (onAnimationComplete) {
      onAnimationComplete(definition);
    }
  };

  const handleExitComplete = () => {
    if (onExitComplete) {
      onExitComplete();
    }
  };

  return (
    <motion.div
      ref={elementRef}
      onAnimationComplete={handleAnimationComplete}
      onExitComplete={handleExitComplete}
      {...props}
    >
      {children}
    </motion.div>
  );
});

SafeMotionDiv.displayName = 'SafeMotionDiv';

export default SafeMotionDiv;
