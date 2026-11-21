import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'flex h-10 w-full rounded-xl border border-border/80 bg-white/70 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground shadow-[inset_0_1px_2px_rgba(30,50,80,0.035)] backdrop-blur-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/45 disabled:cursor-not-allowed disabled:opacity-50 transition-all dark:bg-white/5',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';
