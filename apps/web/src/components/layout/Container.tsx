import type { HTMLAttributes } from 'react';

export function Container({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`container ${className}`.trim()} {...props}>{children}</div>;
}

