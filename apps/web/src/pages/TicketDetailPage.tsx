import { ArrowLeft, CalendarDays, MapPin, Printer, Ticket as TicketIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Container, PageMeta } from '../components/layout';
import { Badge, Button, Card, ErrorState, Skeleton } from '../components/ui';
import { useTicketQrQuery, useTicketQuery } from '../hooks/useTicketQueries';
import { QrCode } from '../components/tickets/QrCode';

export function TicketDetailPage() {
  const { id } = useParams(); const ticket = useTicketQuery(id); const qr = useTicketQrQuery(id);
  if (ticket.isLoading) return <Container className="page-container"><Skeleton className="detail-copy-skeleton" /></Container>;
  if (ticket.isError || !ticket.data) return <Container className="page-container"><ErrorState title="Ticket not found" description="This ticket is unavailable or you do not have access to it." /></Container>;
  const value = ticket.data;
  return <><PageMeta title={`Ticket ${value.ticketCode}`} description={`Ticket for ${value.booking.event.title}.`} /><Container className="page-container"><Link className="text-link" to="/tickets"><ArrowLeft size={15} /> Back to tickets</Link><div className="booking-detail-header"><div><p className="eyebrow">Event ticket</p><h1>{value.booking.event.title}</h1><p>{value.ticketCode}</p></div><Badge tone={value.status === 'ISSUED' ? 'lime' : 'danger'}>{value.status}</Badge></div><div className="booking-detail-grid"><Card className="booking-detail-main"><div className="detail-facts"><div><CalendarDays size={18} /><span><strong>{new Date(value.booking.event.startAt).toLocaleDateString()}</strong><small>{new Date(value.booking.event.startAt).toLocaleTimeString()}</small></span></div><div><MapPin size={18} /><span><strong>{value.booking.event.venueName}</strong><small>{value.booking.event.address}</small></span></div></div><h2>{value.bookingItem?.ticketName ?? 'General admission'}</h2><p>Booking number: <strong>{value.booking.bookingNumber}</strong></p><p>Attendee: <strong>Your account</strong></p><Button variant="outline" onClick={() => window.print()}><Printer size={16} /> Print ticket</Button></Card><Card className="booking-summary-card"><TicketIcon size={22} /><h2>Entry code</h2>{qr.isLoading ? <Skeleton className="qr-skeleton" /> : qr.isError ? <p>QR code is unavailable for this ticket.</p> : qr.data?.payload ? <><QrCode value={qr.data.payload} /><p className="form-note">Show this QR code to the event organizer. Its opaque payload is never included in ordinary ticket responses.</p><code className="ticket-code-print">{value.ticketCode}</code></> : <p>QR code is unavailable for this ticket.</p>}</Card></div></Container></>;
}
