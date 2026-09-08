import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../api/categories';
import { getEvent, getEvents, getRelatedEvents, type EventListQuery } from '../api/events';
import { getOrganizer, getOrganizerEvents, getOrganizers } from '../api/organizers';
import { getEventReviews } from '../api/reviews';

export function useEventsQuery(query: EventListQuery, enabled = true) {
  return useQuery({
    queryKey: ['events', query],
    queryFn: () => getEvents(query),
    enabled,
    staleTime: 30_000,
  });
}

export function useEventQuery(slug: string | undefined) {
  return useQuery({
    queryKey: ['event', slug],
    queryFn: () => getEvent(slug!),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}

export function useRelatedEventsQuery(slug: string | undefined) {
  return useQuery({
    queryKey: ['related-events', slug],
    queryFn: () => getRelatedEvents(slug!),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}

export function useEventReviewsQuery(eventId: string | undefined, page = 1) {
  return useQuery({
    queryKey: ['event-reviews', eventId, page],
    queryFn: () => getEventReviews(eventId!, page),
    enabled: Boolean(eventId),
    staleTime: 30_000,
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    staleTime: 5 * 60_000,
  });
}

export function useOrganizersQuery() {
  return useQuery({
    queryKey: ['organizers'],
    queryFn: () => getOrganizers(),
    staleTime: 60_000,
  });
}

export function useOrganizerQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['organizer', id],
    queryFn: () => getOrganizer(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useOrganizerEventsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['organizer-events', id],
    queryFn: () => getOrganizerEvents(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
