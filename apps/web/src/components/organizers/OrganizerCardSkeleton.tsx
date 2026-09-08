import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export function OrganizerCardSkeleton() {
  return <Card className="organizer-card"><Skeleton className="skeleton-avatar" /><div><Skeleton style={{ width: '8rem', height: '1rem' }} /><Skeleton style={{ width: '13rem', height: '0.75rem' }} /></div></Card>;
}

