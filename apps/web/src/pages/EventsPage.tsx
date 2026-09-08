import { Grid2X2, List, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EventListQuery, EventSort } from '../api/events';
import { Container, PageMeta, SectionHeader } from '../components/layout';
import { EventCardSkeleton } from '../components/events/EventCardSkeleton';
import { EventGrid } from '../components/events/EventGrid';
import { Badge, Button, EmptyState, ErrorState, Input, Pagination, Select } from '../components/ui';
import { useCategoriesQuery, useEventsQuery } from '../hooks/usePublicQueries';

const sortOptions: Array<{ value: EventSort; label: string }> = [
  { value: 'upcoming', label: 'Upcoming first' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price-low-high', label: 'Price: low to high' },
  { value: 'price-high-low', label: 'Price: high to low' },
];

function parseQuery(params: URLSearchParams): EventListQuery {
  const number = (value: string | null) => value && Number.isFinite(Number(value)) ? Number(value) : undefined;
  const type = params.get('type');
  const sort = params.get('sort');
  return {
    search: params.get('search') || undefined,
    category: params.get('category') || undefined,
    location: params.get('location') || undefined,
    date: params.get('date') || undefined,
    type: type === 'FREE' || type === 'PAID' ? type : undefined,
    minPrice: number(params.get('minPrice')),
    maxPrice: number(params.get('maxPrice')),
    sort: sortOptions.some((item) => item.value === sort) ? sort as EventSort : 'upcoming',
    page: Math.max(1, number(params.get('page')) ?? 1),
    limit: 12,
  };
}

export function EventsPage() {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseQuery(params), [params]);
  const [list, setList] = useState(false);
  const categories = useCategoriesQuery();
  const events = useEventsQuery(query);

  const update = (changes: Partial<EventListQuery>) => {
    const next = new URLSearchParams(params);
    Object.entries({ ...changes, page: changes.page ?? 1 }).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    setParams(next);
  };

  const activeFilters = Object.entries(query).filter(([key, value]) => value !== undefined && value !== '' && !['page', 'limit', 'sort'].includes(key));

  return <>
    <PageMeta title="Discover events" description="Find memorable events, communities, and experiences on Aayojak." />
    <Container className="page-container">
      <SectionHeader eyebrow="Discover" title="Find your next pulse" description="Search public events by what you love, where you want to go, or when you are free." />
      <section className="event-toolbar" aria-label="Event filters">
        <div className="filter-main"><Input aria-label="Search events" placeholder="Search events, venues, or topics" value={query.search ?? ''} onChange={(event) => update({ search: event.target.value })} /><Input aria-label="Location" placeholder="Location" value={query.location ?? ''} onChange={(event) => update({ location: event.target.value })} /><Button variant="secondary" size="sm" type="button" onClick={() => document.getElementById('event-filters')?.classList.toggle('filters-open')}><SlidersHorizontal size={16} /> Filters</Button></div>
        <div className="toolbar-actions"><Select aria-label="Sort events" value={query.sort} onChange={(event) => update({ sort: event.target.value as EventSort })}>{sortOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</Select><div className="view-toggle" role="group" aria-label="Event view"><Button variant={list ? 'ghost' : 'secondary'} size="sm" aria-label="Grid view" aria-pressed={!list} onClick={() => setList(false)}><Grid2X2 size={16} /></Button><Button variant={list ? 'secondary' : 'ghost'} size="sm" aria-label="List view" aria-pressed={list} onClick={() => setList(true)}><List size={16} /></Button></div></div>
      </section>
      <section id="event-filters" className="event-filters" aria-label="More event filters">
        <Select label="Category" value={query.category ?? ''} onChange={(event) => update({ category: event.target.value || undefined })}><option value="">All categories</option>{categories.data?.items.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</Select>
        <Select label="Entry" value={query.type ?? ''} onChange={(event) => update({ type: (event.target.value || undefined) as EventListQuery['type'] })}><option value="">Free and paid</option><option value="FREE">Free events</option><option value="PAID">Paid events</option></Select>
        <Input label="Date" type="date" value={query.date ?? ''} onChange={(event) => update({ date: event.target.value || undefined })} />
        <Input label="Minimum price" type="number" min="0" value={query.minPrice ?? ''} onChange={(event) => update({ minPrice: event.target.value ? Number(event.target.value) : undefined })} />
        <Input label="Maximum price" type="number" min="0" value={query.maxPrice ?? ''} onChange={(event) => update({ maxPrice: event.target.value ? Number(event.target.value) : undefined })} />
      </section>
      {activeFilters.length ? <div className="active-filters" aria-label="Active filters">{activeFilters.map(([key, value]) => <Badge key={key} tone="neutral">{key}: {String(value)} <button type="button" aria-label={`Remove ${key} filter`} onClick={() => update({ [key]: undefined })}><X size={12} /></button></Badge>)}</div> : null}
      {events.isLoading ? <div className="event-grid">{Array.from({ length: 6 }, (_, index) => <EventCardSkeleton key={index} />)}</div> : events.isError ? <ErrorState description="We could not load events right now." onRetry={() => void events.refetch()} /> : events.data?.items.length ? <><p className="results-meta" aria-live="polite">Showing {events.data.items.length} of {events.data.pagination.total} public events</p><EventGrid events={events.data.items} list={list} /><Pagination page={events.data.pagination.page} totalPages={events.data.pagination.totalPages} onChange={(page) => update({ page })} /></> : <EmptyState title="No events match yet" description="Try another search or clear a filter to widen the rhythm." action={<Button variant="outline" onClick={() => setParams(new URLSearchParams())}>Clear filters</Button>} />}
    </Container>
  </>;
}
