import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { startBookingExpirationJob } from './jobs/booking-expiration.job.js';

const app = createApp();
const stopBookingExpirationJob = startBookingExpirationJob();

const server = app.listen(env.PORT, () => {
  console.log(`Aayojak API listening on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  console.info(`Received ${signal}; shutting down Aayojak API.`);
  stopBookingExpirationJob();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
