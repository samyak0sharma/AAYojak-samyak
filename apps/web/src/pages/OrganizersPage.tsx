import { Link } from 'react-router-dom';
import { Container, PageMeta, SectionHeader } from '../components/layout';
import { OrganizerCard, OrganizerCardSkeleton } from '../components/organizers';
import { EmptyState, ErrorState } from '../components/ui';
import { useOrganizersQuery } from '../hooks/usePublicQueries';

export function OrganizersPage() {
  const query = useOrganizersQuery();
  return <>
    <PageMeta title="Meet organizers" description="Discover the people and teams shaping memorable events on Aayojak." />
    <Container className="page-container"><SectionHeader eyebrow="People behind the pulse" title="Meet the organizers" description="Find trusted event makers and follow the communities they bring together." />
      {query.isLoading ? <div className="organizer-grid">{Array.from({ length: 6 }, (_, index) => <OrganizerCardSkeleton key={index} />)}</div> : query.isError ? <ErrorState description="Organizers are not available right now." onRetry={() => void query.refetch()} /> : query.data?.items.length ? <div className="organizer-grid">{query.data.items.map((organizer) => <OrganizerCard organizer={organizer} key={organizer.id} />)}</div> : <EmptyState title="No organizers published" description="Approved organizers will appear here as they launch their next event." action={<Link className="button button-outline" to="/events">Discover events</Link>} />}
    </Container>
  </>;
}
