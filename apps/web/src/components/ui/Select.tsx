import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, error, id, children, ...props }, ref) {
  const selectId = id ?? props.name;
  return (
    <label className="field" htmlFor={selectId}>
      {label ? <span className="field-label">{label}</span> : null}
      <select ref={ref} id={selectId} className={`select ${error ? 'input-error' : ''}`} aria-invalid={Boolean(error)} {...props}>
        {children}
      </select>
      {error ? <span className="field-error" role="alert">{error}</span> : null}
    </label>
  );
});
