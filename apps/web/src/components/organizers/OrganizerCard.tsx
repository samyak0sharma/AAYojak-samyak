import { ArrowUpRight, CalendarRange } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Organizer } from '../../api/organizers';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';

export function OrganizerCard({ organizer }: { organizer: Organizer }) {
  return <Card className="organizer-card"><Link to={`/organizers/${organizer.id}`} className="organizer-card-link"><Avatar name={organizer.name} src={organizer.logoUrl} size="lg" /><div className="organizer-card-copy"><h3>{organizer.name}</h3><p>{organizer.description || 'Independent event makers and community builders.'}</p><span><CalendarRange size={14} /> {organizer._count?.events ?? 0} public events</span></div><ArrowUpRight size={18} /></Link></Card>;
}

