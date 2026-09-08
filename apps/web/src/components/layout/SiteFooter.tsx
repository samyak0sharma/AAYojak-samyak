import { ArrowUpRight, Instagram, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Container } from './Container';

export function SiteFooter() {
  return <footer className="site-footer"><Container><div className="footer-grid"><div className="footer-brand"><Link to="/" className="brand"><span className="brand-mark"><span className="pulse-line" /></span><span><strong>आयजक</strong><small>Aayojak</small></span></Link><p>Make room for the moments that move you.</p><div className="footer-meta"><span><MapPin size={14} /> Nepal & beyond</span><span><Mail size={14} /> hello@aayojak.com</span></div></div><div><p className="footer-label">Explore</p><Link to="/events">Events</Link><Link to="/categories">Categories</Link><Link to="/organizers">Organizers</Link></div><div><p className="footer-label">Aayojak</p><Link to="/about">About the platform</Link><Link to="/login">For organizers</Link><Link to="/login">Sign in</Link></div><div><p className="footer-label">Stay in the loop</p><p className="footer-note">A thoughtful digest of the events worth leaving home for.</p><span className="footer-contact"><Instagram size={15} /> Follow the pulse <ArrowUpRight size={14} /></span></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Aayojak. Built for meaningful gatherings.</span><span>आयजक · Event pulse for everyone.</span></div></Container></footer>;
}

