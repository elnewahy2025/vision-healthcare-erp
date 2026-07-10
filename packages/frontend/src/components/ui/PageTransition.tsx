import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wraps page content with a fade-in animation.
 * Uses CSS animation defined in globals.css.
 */
export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="animate-fade-in motion-reduce:animate-none">
      {children}
    </div>
  );
}
