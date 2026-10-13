import { Link } from 'react-router-dom';
import { Ticket as TicketIcon, CalendarDays } from 'lucide-react';
import { Container, PageMeta, SectionHeader } from '../components/layout';
import { Badge, Card, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { useMyTicketsQuery } from '../hooks/useTicketQueries';

export function TicketsPage() {
  const tickets = useMyTicketsQuery();
  const content = tickets.isLoading ? <Card><Skeleton className="table-skeleton" /></Card> : tickets.isError ? <ErrorState description="We could not load your tickets." onRetry={() => void tickets.refetch()} /> : tickets.data?.items.length ? <div className="booking-list">{tickets.data.items.map((ticket) => <Link className="booking-card" to={`/tickets/${ticket.id}`} key={ticket.id}><div className="booking-card-icon"><TicketIcon size={20} /></div><div className="booking-card-copy"><div><Badge tone={ticket.status === 'ISSUED' ? 'lime' : ticket.status === 'CANCELLED' ? 'danger' : 'neutral'}>{ticket.status}</Badge><small>{ticket.ticketCode}</small></div><h3>{ticket.booking.event.title}</h3><p><CalendarDays size={14} /> {new Date(ticket.booking.event.startAt).toLocaleString()} · {ticket.booking.event.venueName}</p></div></Link>)}</div> : <EmptyState title="No tickets yet" description="Tickets appear after a booking is confirmed." />;
  return <><PageMeta title="My tickets" description="Your issued Aayojak event tickets." /><Container className="page-container"><SectionHeader eyebrow="Your Aayojak" title="My tickets" description="Confirmed tickets and event entry details." />{content}</Container></>;
}
