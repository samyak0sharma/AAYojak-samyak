import { CalendarDays, MapPin, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EventSummary } from '../../api/events';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ImageWithFallback } from '../ui/ImageWithFallback';

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-NP', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(new Date(value));
}

function lowestPrice(event: EventSummary) {
  const first = event.ticketTiers[0];
  return first ? `${first.currency} ${Number(first.price).toLocaleString('en-NP')}` : 'Free entry';
}

export function EventCard({ event, compact = false }: { event: EventSummary; compact?: boolean }) {
  return <Card className={`event-card ${compact ? 'event-card-compact' : ''}`}><Link to={`/events/${event.slug}`} className="event-card-image-link" aria-label={`View ${event.title}`}><ImageWithFallback src={event.coverImageUrl ?? undefined} alt="" loading="lazy" className="event-card-image" /><span className="event-card-pulse" aria-hidden="true" /></Link><div className="event-card-body"><div className="event-card-topline"><Badge tone={event.eventType === 'FREE' ? 'lime' : 'accent'}>{event.eventType === 'FREE' ? 'Free' : lowestPrice(event)}</Badge><span className="event-card-date"><CalendarDays size={14} /> {formatDate(event.startAt, event.timezone)}</span></div><h3><Link to={`/events/${event.slug}`}>{event.title}</Link></h3><p className="event-card-organizer">Hosted by {event.organizer.name}</p><div className="event-card-meta"><span><MapPin size={14} /> {event.venueName}</span><span><Ticket size={14} /> {event._count.bookings} going</span></div>{event.categories[0] ? <span className="event-card-category">{event.categories[0].category.name}</span> : null}</div></Card>;
}
