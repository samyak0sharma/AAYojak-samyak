import { Search } from 'lucide-react';
import { Input } from './Input';

export function SearchInput({ value, onChange, onSubmit, placeholder = 'Search events, categories, or places' }: { value: string; onChange: (value: string) => void; onSubmit?: () => void; placeholder?: string }) {
  return (
    <form className="search-input" onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }} role="search">
      <Search size={18} aria-hidden="true" />
      <Input aria-label="Search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <button type="submit" className="search-submit">Search</button>
    </form>
  );
}

