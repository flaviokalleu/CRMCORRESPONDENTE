import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-md border border-caixa-gray-300 bg-white px-3 py-2 text-sm text-caixa-gray-900',
      'placeholder:text-caixa-gray-400',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caixa-primary/40 focus-visible:border-caixa-primary',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-colors',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
