export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return src ? <img className={`avatar avatar-${size}`} src={src} alt={name} /> : <span className={`avatar avatar-${size}`} aria-label={name}>{initials || 'A'}</span>;
}
