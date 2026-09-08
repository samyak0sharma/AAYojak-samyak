import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Compass, Menu, Search, UserRound, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Avatar } from '../ui/Avatar';
import { Container } from './Container';

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Events', to: '/events' },
  { label: 'Categories', to: '/categories' },
  { label: 'Organizers', to: '/organizers' },
  { label: 'About', to: '/about' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = search.trim();
    navigate(value ? `/events?search=${encodeURIComponent(value)}` : '/events');
    setOpen(false);
  };

  return <header className="site-header"><Container className="header-inner">
    <Link to="/" className="brand" aria-label="Aayojak home"><span className="brand-mark"><Compass size={20} /></span><span><strong>आयजक</strong><small>Aayojak</small></span></Link>
    <nav className="desktop-nav" aria-label="Primary navigation">{navItems.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{item.label}</NavLink>)}</nav>
    <div className="header-actions"><form className="header-search" onSubmit={submitSearch}><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search events" placeholder="Search" /></form><ThemeToggle />{isLoading ? <span className="auth-skeleton" aria-label="Loading session" /> : user ? <Link to="/dashboard" className="user-chip" aria-label="Open dashboard"><Avatar name={`${user.firstName} ${user.lastName}`} src={user.avatarUrl} size="sm" /><span>{user.firstName}</span></Link> : <Link className="button button-primary button-sm header-login" to="/login"><UserRound size={15} /> Sign in</Link>}<button className="mobile-menu-button icon-button" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X size={21} /> : <Menu size={21} />}</button></div>
    <AnimatePresence>{open ? <motion.div className="mobile-nav" initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}><nav aria-label="Mobile navigation">{navItems.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>{item.label}</NavLink>)}<form className="mobile-search" onSubmit={submitSearch}><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search events" placeholder="Search events" /><button className="button button-primary button-sm" type="submit">Search</button></form>{isLoading ? <span className="mobile-nav-link">Checking session…</span> : user ? <Link to="/dashboard" className="mobile-nav-link" onClick={() => setOpen(false)}>Dashboard</Link> : <Link to="/login" className="mobile-nav-link" onClick={() => setOpen(false)}>Sign in</Link>}</nav></motion.div> : null}</AnimatePresence>
  </Container></header>;
}
