import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEventQuery } from '../hooks/usePublicQueries';
import { ReviewForm } from '../components/events/ReviewForm';
import { Container, PageMeta } from '../components/layout';
import { Card, ErrorState, Skeleton } from '../components/ui';

export function EventReviewPage() {
  const { slug } = useParams(); const event = useEventQuery(slug);
  if (event.isLoading) return <Container className="page-container"><Skeleton className="detail-copy-skeleton" /></Container>;
  if (event.isError || !event.data) return <Container className="page-container"><ErrorState title="Event not found" description="This event is no longer available." /></Container>;
  return <><PageMeta title={`Review ${event.data.title}`} description={`Share your experience of ${event.data.title}.`} /><Container className="page-container"><Link className="text-link" to={`/events/${event.data.slug}`}><ArrowLeft size={15} /> Back to event</Link><Card className="form-section"><h1>Review {event.data.title}</h1><p>Reviews are checked before they appear publicly.</p><ReviewForm eventId={event.data.id} /></Card></Container></>;
}
