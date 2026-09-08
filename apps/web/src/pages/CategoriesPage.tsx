import { Link } from 'react-router-dom';
import { Container, PageMeta, SectionHeader } from '../components/layout';
import { CategoryCard } from '../components/categories/CategoryCard';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
import { useCategoriesQuery } from '../hooks/usePublicQueries';

export function CategoriesPage() {
  const query = useCategoriesQuery();
  return <>
    <PageMeta title="Browse categories" description="Explore events by category on Aayojak." />
    <Container className="page-container"><SectionHeader eyebrow="Explore your way" title="Browse categories" description="From learning circles to late-night stages, start with a feeling." />
      {query.isLoading ? <div className="category-grid">{Array.from({ length: 8 }, (_, index) => <Skeleton className="category-skeleton" key={index} />)}</div> : query.isError ? <ErrorState description="Categories are taking a short pause." onRetry={() => void query.refetch()} /> : query.data?.items.length ? <div className="category-grid">{query.data.items.map((category) => <CategoryCard category={category} key={category.id} />)}</div> : <EmptyState title="No categories published" description="Once categories are available, they will appear here." action={<Link className="button button-outline" to="/events">Browse all events</Link>} />}
    </Container>
  </>;
}
