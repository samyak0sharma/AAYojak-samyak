import { expirePendingBookings } from '../modules/bookings/bookings.service.js';

const EXPIRATION_INTERVAL_MS = 60_000;

export function startBookingExpirationJob() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await expirePendingBookings();
    } catch (error) {
      console.error('Pending booking expiration job failed.', error);
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(() => void run(), EXPIRATION_INTERVAL_MS);
  return () => clearInterval(timer);
}
