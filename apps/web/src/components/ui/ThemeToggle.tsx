import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
  const label = mode === 'light' ? 'Light theme' : mode === 'dark' ? 'Dark theme' : 'System theme';
  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Laptop;
  return <button className="icon-button theme-toggle" aria-label={`Switch theme; currently ${label}`} title={label} onClick={() => setMode(next)}><Icon size={18} /></button>;
}

