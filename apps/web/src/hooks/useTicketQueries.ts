import { useQuery } from '@tanstack/react-query';
import { getMyTickets, getTicket, getTicketQr } from '../api/tickets';
export function useMyTicketsQuery(page = 1) { return useQuery({ queryKey: ['tickets', page], queryFn: () => getMyTickets(page), staleTime: 15_000 }); }
export function useTicketQuery(id: string | undefined) { return useQuery({ queryKey: ['ticket', id], queryFn: () => getTicket(id!), enabled: Boolean(id) }); }
export function useTicketQrQuery(id: string | undefined) { return useQuery({ queryKey: ['ticket-qr', id], queryFn: () => getTicketQr(id!), enabled: Boolean(id) }); }
