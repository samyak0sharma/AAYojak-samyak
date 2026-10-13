import { CalendarDays, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Container, PageMeta, SectionHeader } from '../components/layout';
import { Card, EmptyState, ErrorState, ImageWithFallback, Skeleton } from '../components/ui';
import { useQuery } from '@tanstack/react-query';
import { getFavorites } from '../api/favorites';

export function FavoritesPage() {
  const favorites = useQuery({ queryKey: ['favorites'], queryFn: () => getFavorites() });
  return <><PageMeta title="Favorite events" description="Events you saved on Aayojak." /><Container className="page-container"><SectionHeader eyebrow="Your Aayojak" title="Favorite events" description="Keep the events you want to come back to close at hand." />{favorites.isLoading ? <Card><Skeleton className="table-skeleton" /></Card> : favorites.isError ? <ErrorState description="We could not load your favorites." onRetry={() => void favorites.refetch()} /> : favorites.data?.items.length ? <div className="booking-list">{favorites.data.items.map((favorite) => <Link className="booking-card" to={`/events/${favorite.event.slug}`} key={favorite.id}><ImageWithFallback src={favorite.event.coverImageUrl ?? undefined} alt={favorite.event.title} className="favorite-cover" /><div className="booking-card-copy"><h3>{favorite.event.title}</h3><p><CalendarDays size={14} /> {new Date(favorite.event.startAt).toLocaleString()} · {favorite.event.venueName}</p><small>{favorite.event.organizer.name}</small></div><Heart size={18} fill="currentColor" /></Link>)}</div> : <EmptyState title="No favorites yet" description="Save events you want to revisit." action={<Heart size={20} />} />}</Container></>;
}
