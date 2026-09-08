import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelMyOrganizerEvent, createMyOrganizerEvent, deleteMyOrganizerDraft, getMyOrganizer, getMyOrganizerAnalytics, getMyOrganizerAttendees, getMyOrganizerBookings, getMyOrganizerEvent, getMyOrganizerEvents, getMyOrganizerRevenue, getMyOrganizerTickets, submitMyOrganizerEvent, updateMyOrganizer, updateMyOrganizerEvent, type OrganizerEventInput, type OrganizerEventListQuery } from '../api/organizers';

export function useMyOrganizerQuery() { return useQuery({ queryKey: ['organizer-me'], queryFn: getMyOrganizer, staleTime: 60_000 }); }
export function useMyOrganizerEventsQuery(query: OrganizerEventListQuery = {}) { return useQuery({ queryKey: ['organizer-events', query], queryFn: () => getMyOrganizerEvents(query), staleTime: 15_000 }); }
export function useMyOrganizerEventQuery(id: string | undefined) { return useQuery({ queryKey: ['organizer-event', id], queryFn: () => getMyOrganizerEvent(id!), enabled: Boolean(id), staleTime: 15_000 }); }
export function useMyOrganizerAnalyticsQuery() { return useQuery({ queryKey: ['organizer-analytics'], queryFn: getMyOrganizerAnalytics, staleTime: 30_000 }); }
export function useMyOrganizerRevenueQuery() { return useQuery({ queryKey: ['organizer-revenue'], queryFn: getMyOrganizerRevenue, staleTime: 30_000 }); }
export function useMyOrganizerBookingsQuery(page = 1, search?: string) { return useQuery({ queryKey: ['organizer-bookings', page, search], queryFn: () => getMyOrganizerBookings({ page, limit: 25, search }), staleTime: 15_000 }); }
export function useMyOrganizerAttendeesQuery(page = 1, search?: string, checkedIn?: 'true' | 'false') { return useQuery({ queryKey: ['organizer-attendees', page, search, checkedIn], queryFn: () => getMyOrganizerAttendees({ page, limit: 25, search, checkedIn }), staleTime: 15_000 }); }
export function useMyOrganizerTicketsQuery(page = 1) { return useQuery({ queryKey: ['organizer-tickets', page], queryFn: () => getMyOrganizerTickets({ page, limit: 25 }), staleTime: 15_000 }); }

export function useSaveOrganizerEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id?: string; input: OrganizerEventInput }) => id ? updateMyOrganizerEvent(id, input) : createMyOrganizerEvent(input), onSuccess: (event) => { void queryClient.invalidateQueries({ queryKey: ['organizer-events'] }); void queryClient.setQueryData(['organizer-event', event.id], event); } });
}
export function useSubmitOrganizerEventMutation() { const client = useQueryClient(); return useMutation({ mutationFn: submitMyOrganizerEvent, onSuccess: () => { void client.invalidateQueries({ queryKey: ['organizer-events'] }); void client.invalidateQueries({ queryKey: ['organizer-analytics'] }); } }); }
export function useCancelOrganizerEventMutation() { const client = useQueryClient(); return useMutation({ mutationFn: cancelMyOrganizerEvent, onSuccess: () => { void client.invalidateQueries({ queryKey: ['organizer-events'] }); void client.invalidateQueries({ queryKey: ['organizer-analytics'] }); } }); }
export function useDeleteOrganizerDraftMutation() { const client = useQueryClient(); return useMutation({ mutationFn: deleteMyOrganizerDraft, onSuccess: () => { void client.invalidateQueries({ queryKey: ['organizer-events'] }); void client.invalidateQueries({ queryKey: ['organizer-analytics'] }); } }); }
export function useUpdateOrganizerMutation() { const client = useQueryClient(); return useMutation({ mutationFn: updateMyOrganizer, onSuccess: () => { void client.invalidateQueries({ queryKey: ['organizer-me'] }); } }); }
