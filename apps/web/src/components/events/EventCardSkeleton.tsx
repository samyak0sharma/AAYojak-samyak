import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export function EventCardSkeleton() {
  return <Card className="event-card"><Skeleton className="skeleton-image" /><div className="event-card-body"><Skeleton style={{ width: '6rem', height: '1rem' }} /><Skeleton className="skeleton-line-wide" /><Skeleton style={{ width: '70%', height: '0.8rem' }} /><Skeleton style={{ width: '85%', height: '0.8rem' }} /></div></Card>;
}

