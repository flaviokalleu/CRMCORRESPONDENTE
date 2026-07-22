import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-caixa-primary text-white hover:bg-caixa-secondary focus-visible:ring-caixa-primary',
        accent: 'bg-caixa-orange text-white hover:bg-caixa-orange-dark focus-visible:ring-caixa-orange',
        outline: 'border border-caixa-gray-300 bg-white text-caixa-gray-700 hover:bg-caixa-gray-50 focus-visible:ring-caixa-primary',
        ghost: 'text-caixa-gray-600 hover:bg-caixa-gray-100 hover:text-caixa-gray-900',
        destructive: 'bg-caixa-error text-white hover:bg-red-600 focus-visible:ring-caixa-error',
        link: 'text-caixa-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
