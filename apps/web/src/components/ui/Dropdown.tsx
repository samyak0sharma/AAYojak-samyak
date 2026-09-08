import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface DropdownItem { label: string; onSelect: () => void; disabled?: boolean }

export function Dropdown({ label, items }: { label: ReactNode; items: DropdownItem[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="dropdown" ref={root}><button type="button" className="button button-outline button-sm" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{label}<ChevronDown size={14} /></button>{open ? <div className="dropdown-menu" role="menu">{items.map((item) => <button type="button" role="menuitem" className="dropdown-item" key={item.label} disabled={item.disabled} onClick={() => { item.onSelect(); setOpen(false); }}>{item.label}</button>)}</div> : null}</div>;
}
