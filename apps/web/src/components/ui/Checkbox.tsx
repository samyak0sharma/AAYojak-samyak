import { forwardRef, type InputHTMLAttributes } from 'react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, id, ...props }, ref) {
  const checkboxId = id ?? props.name;
  return (
    <label className="checkbox" htmlFor={checkboxId}>
      <input ref={ref} id={checkboxId} type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
});

