import { CalendarDays, Clock3, MapPin, Star, Ticket, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEventQuery, useEventReviewsQuery, useRelatedEventsQuery } from '../hooks/usePublicQueries';
import { Badge, Card, EmptyState, ErrorState, ImageWithFallback, Pagination, Skeleton } from '../components/ui';
import { Avatar } from '../components/ui/Avatar';
import { EventGallery, EventMap } from '../components/events';
import { EventCard } from '../components/events/EventCard';
import { Container, PageMeta } from '../components/layout';
import type { TicketTierSummary } from '../api/events';

function remaining(tier: TicketTierSummary) {
  return Math.max(0, tier.quantity - tier.reservedQuantity - tier.soldQuantity);
}

function tierStatus(tier: TicketTierSummary) {
  const now = Date.now();
  const available = remaining(tier);
  if (!tier.isActive || available <= 0) return { label: 'Sold out', tone: 'danger' as const };
  if (tier.saleStartAt && new Date(tier.saleStartAt).getTime() > now) return { label: `Sales open ${new Intl.DateTimeFormat('en-NP', { dateStyle: 'medium' }).format(new Date(tier.saleStartAt))}`, tone: 'neutral' as const };
  if (tier.saleEndAt && new Date(tier.saleEndAt).getTime() < now) return { label: 'Sales closed', tone: 'neutral' as const };
  return { label: `${available} remaining`, tone: available < 10 ? 'accent' as const : 'lime' as const };
}

function tierIsOpen(tier: TicketTierSummary) {
  const now = Date.now();
  return tier.isActive && remaining(tier) > 0 && (!tier.saleStartAt || new Date(tier.saleStartAt).getTime() <= now) && (!tier.saleEndAt || new Date(tier.saleEndAt).getTime() >= now);
}

function formatDate(value: string, timezone?: string) {
  return new Intl.DateTimeFormat('en-NP', { dateStyle: 'medium', timeZone: timezone }).format(new Date(value));
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-NP', { timeStyle: 'short', timeZone: timezone }).format(new Date(value));
}

export function EventDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [reviewPage, setReviewPage] = useState(1);
  useEffect(() => setReviewPage(1), [slug]);
  const eventQuery = useEventQuery(slug);
  const reviewsQuery = useEventReviewsQuery(eventQuery.data?.id, reviewPage);
  const relatedQuery = useRelatedEventsQuery(slug);

  if (eventQuery.isLoading) return <Container className="page-container"><Skeleton className="detail-hero-skeleton" /><Skeleton className="detail-copy-skeleton" /></Container>;
  if (eventQuery.isError || !eventQuery.data) return <Container className="page-container"><ErrorState title="Event not found" description="This event may have moved or is no longer public." onRetry={() => void eventQuery.refetch()} /></Container>;

  const event = eventQuery.data;
  const lowest = event.ticketTiers[0];
  const reservePath = `/events/${event.slug}`;
  const canReserve = event.eventType === 'FREE' || event.ticketTiers.some(tierIsOpen);
  const actionPath = user ? `${reservePath}/book` : `/login?redirect=${encodeURIComponent(`${reservePath}/book`)}`;
  return <>
    <PageMeta title={event.title} description={event.description.slice(0, 155)} />
    <Container className="page-container event-detail">
      <div className="detail-hero">
        <ImageWithFallback src={event.coverImageUrl ?? undefined} alt={event.title} className="detail-cover" />
        <div className="detail-hero-copy">
          <div className="detail-badges"><Badge tone={event.eventType === 'FREE' ? 'lime' : 'accent'}>{event.eventType === 'FREE' ? 'Free event' : lowest ? `${lowest.currency} ${Number(lowest.price).toLocaleString('en-NP')} and up` : 'Paid event'}</Badge>{event.categories.map(({ category }) => <Badge key={category.id} tone="neutral">{category.name}</Badge>)}</div>
          <h1>{event.title}</h1>
          <p>{event.description}</p>
          <div className="detail-organizer"><span>Hosted by</span><Link to={`/organizers/${event.organizer.id}`}>{event.organizer.name}</Link></div>
        </div>
      </div>

      <div className="detail-layout">
        <article className="detail-main">
          <section className="detail-facts" aria-label="Event summary"><div><CalendarDays size={18} /><span><strong>{formatDate(event.startAt, event.timezone)}</strong><small>{formatTime(event.startAt, event.timezone)} – {formatTime(event.endAt, event.timezone)}</small></span></div><div><MapPin size={18} /><span><strong>{event.venueName}</strong><small>{event.address}</small></span></div><div><Users size={18} /><span><strong>{event.capacity ? `${event.capacity} capacity` : `${event._count.bookings} attending`}</strong><small>{event.eventType === 'FREE' ? 'Open registration' : 'Ticketed event'}</small></span></div></section>
          <section className="detail-section"><h2>About this event</h2><p className="detail-description">{event.description}</p></section>
          <EventGallery media={event.media} title={event.title} />
          <EventMap venueName={event.venueName} address={event.address} latitude={event.latitude} longitude={event.longitude} />
          <section className="detail-section reviews-section" aria-labelledby="reviews-heading"><div className="detail-section-heading"><h2 id="reviews-heading">Reviews</h2>{reviewsQuery.data ? <span>{reviewsQuery.data.summary.reviewCount} reviews</span> : null}</div>{reviewsQuery.isLoading ? <div className="review-skeleton"><Skeleton /><Skeleton /><Skeleton /></div> : reviewsQuery.isError ? <ErrorState description="Reviews could not be loaded right now." onRetry={() => void reviewsQuery.refetch()} /> : reviewsQuery.data?.items.length ? <><div className="review-summary"><strong><Star size={17} fill="currentColor" /> {reviewsQuery.data.summary.averageRating.toFixed(1)}</strong><span>Average from {reviewsQuery.data.summary.reviewCount} published reviews</span></div><div className="review-list">{reviewsQuery.data.items.map((review) => <article className="review-card" key={review.id}><Avatar name={`${review.user.firstName} ${review.user.lastName}`} src={review.user.avatarUrl} size="sm" /><div><div className="review-header"><strong>{review.user.firstName} {review.user.lastName}</strong><time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time></div><div className="review-rating" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill={index < review.rating ? 'currentColor' : 'none'} />)}</div><p>{review.comment}</p></div></article>)}</div><Pagination page={reviewsQuery.data.pagination.page} totalPages={reviewsQuery.data.pagination.totalPages} onChange={setReviewPage} /></> : <EmptyState title="No reviews yet" description="Be the first to share an experience after attending." />}</section>
          {event.faqs.length ? <section className="detail-section"><h2>Frequently asked</h2><div className="faq-list">{event.faqs.map((faq) => <details key={faq.id}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section> : null}
          <section className="detail-section organizer-inline"><h2>About the organizer</h2><Link to={`/organizers/${event.organizer.id}`}><Avatar name={event.organizer.name} src={event.organizer.logoUrl} size="lg" /><span><strong>{event.organizer.name}</strong><small>{event.organizer.description || 'View this organizer and their public events.'}</small></span><span aria-hidden="true">→</span></Link></section>
          {relatedQuery.isLoading ? <section className="detail-section"><h2>Related events</h2><div className="event-grid">{Array.from({ length: 2 }, (_, index) => <Skeleton className="event-card-skeleton" key={index} />)}</div></section> : relatedQuery.isError ? <section className="detail-section"><ErrorState title="Related events unavailable" description="We could not load similar public events." onRetry={() => void relatedQuery.refetch()} /></section> : relatedQuery.data?.length ? <section className="detail-section"><div className="detail-section-heading"><h2>Related events</h2><Link className="text-link" to="/events">Explore all</Link></div><div className="event-grid related-grid">{relatedQuery.data.map((related) => <EventCard key={related.id} event={related} />)}</div></section> : null}
        </article>
        <aside className="detail-aside"><Card className="ticket-card"><div className="ticket-card-heading"><div><p className="eyebrow">Your next step</p><h2>{event.eventType === 'FREE' ? 'Reserve your spot' : 'Choose your ticket'}</h2></div><Ticket size={24} /></div>{event.ticketTiers.length ? <ul className="tier-list">{event.ticketTiers.map((tier) => { const status = tierStatus(tier); return <li key={tier.id}><span><strong>{tier.name}</strong><small>{tier.description || (tier.saleEndAt ? `Sales end ${formatDate(tier.saleEndAt)}` : 'General admission')}</small><Badge tone={status.tone}>{status.label}</Badge></span><b>{tier.currency} {Number(tier.price).toLocaleString('en-NP')}</b></li>; })}</ul> : <EmptyState title="Registration details pending" description="The organizer has not published ticket details yet." />}{canReserve ? <Link className="button button-primary button-full" to={actionPath}>{user ? 'Continue from dashboard' : 'Sign in to reserve'}</Link> : <span className="button button-secondary button-full" aria-label="Tickets are unavailable">Tickets unavailable</span>}<small className="aside-note"><Clock3 size={13} /> Secure booking and payment will use the authenticated checkout flow.</small></Card></aside>
      </div>
    </Container>
  </>;
}
