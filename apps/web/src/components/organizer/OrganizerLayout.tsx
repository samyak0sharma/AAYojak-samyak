import { BarChart3, CalendarDays, ChevronRight, ClipboardList, Gauge, LogOut, Menu, ScanLine, Settings2, Ticket, UserRound, Users, Wallet, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui';

const links = [
  { to: '/dashboard/organizer', label: 'Overview', icon: Gauge, end: true },
  { to: '/dashboard/organizer/events', label: 'Events', icon: CalendarDays },
  { to: '/dashboard/organizer/bookings', label: 'Bookings', icon: ClipboardList },
  { to: '/dashboard/organizer/attendees', label: 'Attendees', icon: Users },
  { to: '/dashboard/organizer/tickets', label: 'Tickets', icon: Ticket },
  { to: '/dashboard/organizer/check-in', label: 'Check-in', icon: ScanLine },
  { to: '/dashboard/organizer/revenue', label: 'Revenue', icon: Wallet },
  { to: '/dashboard/organizer/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/organizer/profile', label: 'Profile', icon: UserRound },
  { to: '/dashboard/organizer/settings', label: 'Settings', icon: Settings2 },
];

export function OrganizerLayout({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false); const { user, logout } = useAuth(); const navigate = useNavigate();
  const signOut = async () => { await logout(); navigate('/', { replace: true }); };
  return <div className="dashboard-shell">
    <button className="dashboard-mobile-toggle" type="button" aria-label={open ? 'Close organizer navigation' : 'Open organizer navigation'} onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
    {open ? <button className="dashboard-scrim" aria-label="Close navigation" type="button" onClick={() => setOpen(false)} /> : null}
    <aside className={`dashboard-sidebar ${open ? 'dashboard-sidebar-open' : ''}`}>
      <div className="dashboard-brand"><span className="brand-mark">आ</span><span><strong>आयजक</strong><small>Organizer studio</small></span></div>
      <nav aria-label="Organizer dashboard"><p className="dashboard-nav-label">Workspace</p>{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `dashboard-nav-link ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}><Icon size={17} /><span>{label}</span><ChevronRight className="dashboard-nav-chevron" size={14} /></NavLink>)}</nav>
      <div className="dashboard-user"><Avatar name={user ? `${user.firstName} ${user.lastName}` : 'Organizer'} src={user?.avatarUrl} size="sm" /><div><strong>{user?.firstName} {user?.lastName}</strong><span>Organizer account</span></div><button type="button" className="icon-button" aria-label="Sign out" onClick={() => void signOut()}><LogOut size={16} /></button></div>
    </aside>
    <main className="dashboard-main">{children ?? <Outlet />}</main>
  </div>;
}
