import { ArrowLeft, Check, CreditCard, Minus, Plus, Ticket } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEventQuery } from '../hooks/usePublicQueries';
import { useCreateBookingMutation, useInitiatePaymentMutation } from '../hooks/useBookingQueries';
import { Badge, Button, Card, ErrorState, ImageWithFallback, Select, Skeleton } from '../components/ui';
import { Container, PageMeta } from '../components/layout';
import { useToast } from '../components/ui/ToastProvider';

function remaining(tier: { quantity: number; reservedQuantity: number; soldQuantity: number }) { return Math.max(0, tier.quantity - tier.reservedQuantity - tier.soldQuantity); }
function money(value: number, currency: string) { return `${currency} ${value.toLocaleString('en-NP')}`; }

export function BookingCheckoutPage() {
  const { slug } = useParams(); const navigate = useNavigate(); const { showToast } = useToast();
  const event = useEventQuery(slug); const create = useCreateBookingMutation(); const initiate = useInitiatePaymentMutation();
  const [tierId, setTierId] = useState(''); const [quantity, setQuantity] = useState(1);
  const [provider, setProvider] = useState<'KHALTI' | 'ESEWA'>('KHALTI');
  if (event.isLoading) return <Container className="page-container"><Skeleton className="detail-copy-skeleton" /></Container>;
  if (event.isError || !event.data) return <Container className="page-container"><ErrorState title="Booking unavailable" description="This event could not be loaded for booking." onRetry={() => void event.refetch()} /></Container>;
  const item = event.data.ticketTiers.find((tier) => tier.id === tierId);
  const isFree = event.data.eventType === 'FREE';
  const available = isFree ? Math.max(1, event.data.capacity ?? 10) : item ? remaining(item) : 0;
  const total = item ? Number(item.price) * quantity : 0;
  const submit = async () => {
    if (!isFree && !item) { showToast('Select a ticket tier first.', 'error'); return; }
    try {
      const booking = await create.mutateAsync({ eventId: event.data.id, items: [{ ...(item ? { ticketTierId: item.id } : {}), quantity }] });
      if (isFree) { navigate(`/bookings/${booking.id}`); return; }
      const payment = await initiate.mutateAsync({ bookingId: booking.id, provider });
      if (payment.form) {
        const form = document.createElement('form'); form.method = 'POST'; form.action = payment.redirectUrl;
        Object.entries(payment.form).forEach(([name, value]) => { const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input); });
        document.body.appendChild(form); form.submit();
      } else window.location.assign(payment.redirectUrl);
    }
    catch (error) { showToast(error instanceof Error ? error.message : 'The booking could not be created.', 'error'); }
  };
  return <><PageMeta title={`Book ${event.data.title}`} description={`Reserve your place at ${event.data.title}.`} /><Container className="page-container auth-container"><Link className="text-link" to={`/events/${event.data.slug}`}><ArrowLeft size={15} /> Back to event</Link><div className="booking-layout"><Card className="booking-event-card"><ImageWithFallback src={event.data.coverImageUrl ?? undefined} alt={event.data.title} className="booking-cover" /><div><Badge tone={isFree ? 'lime' : 'accent'}>{isFree ? 'Free registration' : 'Paid booking'}</Badge><h1>{event.data.title}</h1><p>{event.data.venueName} · {new Date(event.data.startAt).toLocaleString()}</p></div></Card><Card className="auth-card booking-form-card"><div className="auth-heading"><p className="eyebrow"><Ticket size={15} /> Secure booking</p><h2>{isFree ? 'Reserve your spot' : 'Choose your ticket'}</h2><p>{isFree ? 'Your confirmed ticket will be issued immediately.' : 'Your place will be held while payment is verified by the provider.'}</p></div>{isFree ? <div className="booking-free-choice"><Check size={18} /><span>General admission</span><strong>Free</strong></div> : <><Select label="Ticket tier" value={tierId} onChange={(e) => { setTierId(e.target.value); setQuantity(1); }}><option value="">Select a tier</option>{event.data.ticketTiers.map((tier) => <option value={tier.id} key={tier.id} disabled={remaining(tier) < 1}>{tier.name} · {money(Number(tier.price), tier.currency)} · {remaining(tier)} left</option>)}</Select><Select label="Payment provider" value={provider} onChange={(e) => setProvider(e.target.value as 'KHALTI' | 'ESEWA')}><option value="KHALTI">Khalti</option><option value="ESEWA">eSewa</option></Select></>}<div className="booking-quantity"><span>Quantity</span><div><Button type="button" variant="ghost" size="sm" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={15} /></Button><strong>{quantity}</strong><Button type="button" variant="ghost" size="sm" aria-label="Increase quantity" disabled={quantity >= Math.min(10, available)} onClick={() => setQuantity((value) => Math.min(10, available, value + 1))}><Plus size={15} /></Button></div></div>{!isFree ? <div className="booking-total"><span>Total</span><strong>{money(total, item?.currency ?? 'NPR')}</strong></div> : null}<Button className="button-full" loading={create.isPending || initiate.isPending} disabled={!isFree && !item} onClick={() => void submit()}><CreditCard size={16} /> {isFree ? 'Confirm free booking' : 'Continue to payment'}</Button><small className="aside-note">Your booking is protected by server-side capacity and ownership checks.</small></Card></div></Container></>;
}
