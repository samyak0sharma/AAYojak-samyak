import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelBooking, createBooking, getBooking, getBookings, initiatePayment, type BookingStatus, type CreateBookingInput, type PaymentProvider } from '../api/bookings';

export function useBookingsQuery(page = 1, status?: BookingStatus) {
  return useQuery({ queryKey: ['bookings', page, status], queryFn: () => getBookings({ page, limit: 10, status }), staleTime: 15_000 });
}

export function useBookingQuery(id: string | undefined) {
  return useQuery({ queryKey: ['booking', id], queryFn: () => getBooking(id!), enabled: Boolean(id), staleTime: 15_000 });
}

export function useCreateBookingMutation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: CreateBookingInput) => createBooking(input), onSuccess: (booking) => { void client.invalidateQueries({ queryKey: ['bookings'] }); client.setQueryData(['booking', booking.id], booking); } });
}

export function useCancelBookingMutation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: cancelBooking, onSuccess: (booking) => { void client.invalidateQueries({ queryKey: ['bookings'] }); client.setQueryData(['booking', booking.id], booking); } });
}

export function useInitiatePaymentMutation() {
  return useMutation({ mutationFn: ({ bookingId, provider }: { bookingId: string; provider: PaymentProvider }) => initiatePayment(bookingId, provider) });
}
