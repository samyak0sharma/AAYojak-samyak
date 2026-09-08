import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DEVELOPMENT ONLY credentials. Replace these values before using any deployed environment.
const DEVELOPMENT_PASSWORD = 'AayojakDevOnly!ChangeMe-2026';

const money = (value: string) => new Prisma.Decimal(value);

function validationToken() {
  const token = randomBytes(32).toString('base64url');
  return {
    hash: createHash('sha256').update(token).digest('hex'),
    qrPayload: `aayojak:v1:${token}`,
  };
}

async function upsertEventCategory(eventId: string, categoryId: string) {
  await prisma.eventCategory.createMany({
    data: [{ eventId, categoryId }],
    skipDuplicates: true,
  });
}

async function upsertTicketTier(input: {
  eventId: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  saleStartAt?: Date;
  saleEndAt?: Date;
}) {
  return prisma.ticketTier.upsert({
    where: {
      eventId_name: {
        eventId: input.eventId,
        name: input.name,
      },
    },
    update: {
      description: input.description,
      price: money(input.price),
      quantity: input.quantity,
      saleStartAt: input.saleStartAt,
      saleEndAt: input.saleEndAt,
      isActive: true,
    },
    create: {
      eventId: input.eventId,
      name: input.name,
      description: input.description,
      price: money(input.price),
      quantity: input.quantity,
      saleStartAt: input.saleStartAt,
      saleEndAt: input.saleEndAt,
    },
  });
}

async function ensureTicket(input: {
  bookingId: string;
  bookingItemId: string;
  ticketCode: string;
  status?: 'ISSUED' | 'USED' | 'CANCELLED' | 'EXPIRED';
}) {
  const existing = await prisma.ticket.findUnique({
    where: { ticketCode: input.ticketCode },
  });

  if (existing) {
    return existing;
  }

  const token = validationToken();
  return prisma.ticket.create({
    data: {
      bookingId: input.bookingId,
      bookingItemId: input.bookingItemId,
      ticketCode: input.ticketCode,
      validationTokenHash: token.hash,
      qrPayload: token.qrPayload,
      status: input.status ?? 'ISSUED',
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEVELOPMENT_PASSWORD, 12);
  const verifiedAt = new Date();

  const admin = await prisma.user.upsert({
    where: { email: 'admin.dev@aayojak.local' },
    update: {
      passwordHash,
      firstName: 'Aayojak',
      lastName: 'Admin',
      role: 'ADMIN',
      emailVerifiedAt: verifiedAt,
      isActive: true,
    },
    create: {
      email: 'admin.dev@aayojak.local',
      passwordHash,
      firstName: 'Aayojak',
      lastName: 'Admin',
      role: 'ADMIN',
      emailVerifiedAt: verifiedAt,
    },
  });

  const organizerUser = await prisma.user.upsert({
    where: { email: 'organizer.dev@aayojak.local' },
    update: {
      passwordHash,
      firstName: 'Maya',
      lastName: 'Rai',
      role: 'ORGANIZER',
      emailVerifiedAt: verifiedAt,
      isActive: true,
    },
    create: {
      email: 'organizer.dev@aayojak.local',
      passwordHash,
      firstName: 'Maya',
      lastName: 'Rai',
      role: 'ORGANIZER',
      emailVerifiedAt: verifiedAt,
    },
  });

  const attendee = await prisma.user.upsert({
    where: { email: 'user.dev@aayojak.local' },
    update: {
      passwordHash,
      firstName: 'Anil',
      lastName: 'Shrestha',
      role: 'USER',
      emailVerifiedAt: verifiedAt,
      isActive: true,
    },
    create: {
      email: 'user.dev@aayojak.local',
      passwordHash,
      firstName: 'Anil',
      lastName: 'Shrestha',
      role: 'USER',
      emailVerifiedAt: verifiedAt,
    },
  });

  const organizer = await prisma.organizer.upsert({
    where: { userId: organizerUser.id },
    update: {
      name: 'Maya Rai Experiences',
      slug: 'maya-rai-experiences',
      description: 'Thoughtful gatherings for curious people across Nepal.',
      contactEmail: organizerUser.email,
      location: 'Kathmandu Valley, Nepal',
      isApproved: true,
    },
    create: {
      userId: organizerUser.id,
      name: 'Maya Rai Experiences',
      slug: 'maya-rai-experiences',
      description: 'Thoughtful gatherings for curious people across Nepal.',
      contactEmail: organizerUser.email,
      location: 'Kathmandu Valley, Nepal',
      isApproved: true,
    },
  });

  const categoryInputs = [
    ['Technology', 'technology'],
    ['Music', 'music'],
    ['Arts & Culture', 'arts-culture'],
    ['Business', 'business'],
    ['Wellness', 'wellness'],
  ] as const;

  const categories = new Map<string, { id: string }>();
  for (const [name, slug] of categoryInputs) {
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name, isActive: true },
      create: { name, slug, isActive: true },
    });
    categories.set(slug, category);
  }

  const now = new Date();
  const eventDates = {
    freeOne: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    freeTwo: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
    paidOne: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000),
    paidTwo: new Date(now.getTime() + 56 * 24 * 60 * 60 * 1000),
  };

  const eventDefinitions = [
    {
      slug: 'kathmandu-creative-coding-circle',
      title: 'Kathmandu Creative Coding Circle',
      description: 'A welcoming evening for makers exploring code, art, and sound.',
      eventType: 'FREE' as const,
      startAt: eventDates.freeOne,
      categories: ['technology', 'arts-culture'],
      venueName: 'Aayojak Studio',
      address: 'Jhamsikhel, Lalitpur, Nepal',
    },
    {
      slug: 'sunrise-wellness-walk',
      title: 'Sunrise Wellness Walk',
      description: 'A gentle guided walk and community breakfast around Shivapuri.',
      eventType: 'FREE' as const,
      startAt: eventDates.freeTwo,
      categories: ['wellness'],
      venueName: 'Budhanilkantha Gate',
      address: 'Budhanilkantha, Kathmandu, Nepal',
    },
    {
      slug: 'himalayan-soundscape-live',
      title: 'Himalayan Soundscape Live',
      description: 'An intimate live performance pairing Nepali instruments with ambient electronics.',
      eventType: 'PAID' as const,
      startAt: eventDates.paidOne,
      categories: ['music', 'arts-culture'],
      venueName: 'The Courtyard Kathmandu',
      address: 'Thamel, Kathmandu, Nepal',
    },
    {
      slug: 'nepal-product-builders-summit',
      title: 'Nepal Product Builders Summit',
      description: 'A full day of practical talks, workshops, and conversations for product teams.',
      eventType: 'PAID' as const,
      startAt: eventDates.paidTwo,
      categories: ['technology', 'business'],
      venueName: 'Lalitpur Convention Hall',
      address: 'Pulchowk, Lalitpur, Nepal',
    },
  ];

  const events = new Map<string, { id: string }>();
  for (const definition of eventDefinitions) {
    const event = await prisma.event.upsert({
      where: { slug: definition.slug },
      update: {
        organizerId: organizer.id,
        title: definition.title,
        description: definition.description,
        eventType: definition.eventType,
        status: 'PUBLISHED',
        startAt: definition.startAt,
        endAt: new Date(definition.startAt.getTime() + 3 * 60 * 60 * 1000),
        venueName: definition.venueName,
        address: definition.address,
        publishedAt: now,
        moderatedAt: now,
        moderatedById: admin.id,
        moderationNote: 'Development seed event approved by the development administrator.',
      },
      create: {
        organizerId: organizer.id,
        slug: definition.slug,
        title: definition.title,
        description: definition.description,
        eventType: definition.eventType,
        status: 'PUBLISHED',
        startAt: definition.startAt,
        endAt: new Date(definition.startAt.getTime() + 3 * 60 * 60 * 1000),
        timezone: 'Asia/Kathmandu',
        venueName: definition.venueName,
        address: definition.address,
        publishedAt: now,
        moderatedAt: now,
        moderatedById: admin.id,
        moderationNote: 'Development seed event approved by the development administrator.',
      },
    });

    for (const categorySlug of definition.categories) {
      const category = categories.get(categorySlug);
      if (!category) {
        throw new Error(`Missing seeded category: ${categorySlug}`);
      }
      await upsertEventCategory(event.id, category.id);
    }

    events.set(definition.slug, event);
  }

  const soundscape = events.get('himalayan-soundscape-live');
  const summit = events.get('nepal-product-builders-summit');
  const creativeCoding = events.get('kathmandu-creative-coding-circle');
  const wellnessWalk = events.get('sunrise-wellness-walk');

  if (!soundscape || !summit || !creativeCoding || !wellnessWalk) {
    throw new Error('Seed event creation did not return all expected events.');
  }

  const saleStartAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const saleEndAt = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);
  const generalTier = await upsertTicketTier({
    eventId: soundscape.id,
    name: 'General',
    description: 'Standard entry to the live performance.',
    price: '1800.00',
    quantity: 240,
    saleStartAt,
    saleEndAt,
  });
  await upsertTicketTier({
    eventId: soundscape.id,
    name: 'VIP',
    description: 'Front seating and a post-show artist conversation.',
    price: '3500.00',
    quantity: 60,
    saleStartAt,
    saleEndAt,
  });

  const summitTier = await upsertTicketTier({
    eventId: summit.id,
    name: 'Early Bird',
    description: 'Discounted summit pass while the allocation lasts.',
    price: '2500.00',
    quantity: 150,
    saleStartAt,
    saleEndAt,
  });
  await upsertTicketTier({
    eventId: summit.id,
    name: 'Premium',
    description: 'Summit pass with a small-group workshop add-on.',
    price: '5500.00',
    quantity: 50,
    saleStartAt,
    saleEndAt,
  });

  const freeBooking = await prisma.booking.upsert({
    where: { bookingNumber: 'DEV-FREE-0001' },
    update: {
      status: 'CONFIRMED',
      subtotal: money('0.00'),
      total: money('0.00'),
      confirmedAt: now,
    },
    create: {
      bookingNumber: 'DEV-FREE-0001',
      userId: attendee.id,
      eventId: creativeCoding.id,
      status: 'CONFIRMED',
      subtotal: money('0.00'),
      total: money('0.00'),
      confirmedAt: now,
      items: {
        create: {
          ticketName: 'General Admission',
          quantity: 1,
          unitPrice: money('0.00'),
          lineTotal: money('0.00'),
        },
      },
    },
  });

  let freeItem = await prisma.bookingItem.findFirst({
    where: { bookingId: freeBooking.id },
  });
  if (!freeItem) {
    freeItem = await prisma.bookingItem.create({
      data: {
        bookingId: freeBooking.id,
        ticketName: 'General Admission',
        quantity: 1,
        unitPrice: money('0.00'),
        lineTotal: money('0.00'),
      },
    });
  }
  await ensureTicket({
    bookingId: freeBooking.id,
    bookingItemId: freeItem.id,
    ticketCode: 'DEV-TICKET-FREE-001',
  });

  const paidBooking = await prisma.booking.upsert({
    where: { bookingNumber: 'DEV-PAID-0001' },
    update: {
      status: 'CONFIRMED',
      subtotal: money('1800.00'),
      total: money('1800.00'),
      confirmedAt: now,
    },
    create: {
      bookingNumber: 'DEV-PAID-0001',
      userId: attendee.id,
      eventId: soundscape.id,
      status: 'CONFIRMED',
      subtotal: money('1800.00'),
      total: money('1800.00'),
      confirmedAt: now,
      items: {
        create: {
          ticketTierId: generalTier.id,
          ticketName: generalTier.name,
          quantity: 1,
          unitPrice: money('1800.00'),
          lineTotal: money('1800.00'),
        },
      },
    },
  });

  let paidItem = await prisma.bookingItem.findFirst({
    where: { bookingId: paidBooking.id },
  });
  if (!paidItem) {
    paidItem = await prisma.bookingItem.create({
      data: {
        bookingId: paidBooking.id,
        ticketTierId: generalTier.id,
        ticketName: generalTier.name,
        quantity: 1,
        unitPrice: money('1800.00'),
        lineTotal: money('1800.00'),
      },
    });
  }
  await ensureTicket({
    bookingId: paidBooking.id,
    bookingItemId: paidItem.id,
    ticketCode: 'DEV-TICKET-PAID-001',
  });

  await prisma.ticketTier.update({
    where: { id: generalTier.id },
    data: { soldQuantity: 1 },
  });

  await prisma.payment.upsert({
    where: { providerReference: 'DEV-KHALTI-0001' },
    update: {
      bookingId: paidBooking.id,
      status: 'COMPLETED',
      amount: money('1800.00'),
      completedAt: now,
    },
    create: {
      bookingId: paidBooking.id,
      provider: 'KHALTI',
      status: 'COMPLETED',
      providerReference: 'DEV-KHALTI-0001',
      amount: money('1800.00'),
      completedAt: now,
    },
  });

  await prisma.review.upsert({
    where: {
      userId_eventId: {
        userId: attendee.id,
        eventId: creativeCoding.id,
      },
    },
    update: {
      rating: 5,
      comment: 'A generous and energizing community evening.',
      status: 'PUBLISHED',
    },
    create: {
      userId: attendee.id,
      eventId: creativeCoding.id,
      rating: 5,
      comment: 'A generous and energizing community evening.',
      status: 'PUBLISHED',
    },
  });

  await prisma.review.upsert({
    where: {
      userId_eventId: {
        userId: attendee.id,
        eventId: soundscape.id,
      },
    },
    update: {
      rating: 4,
      comment: 'Beautiful sound design and a warm room.',
      status: 'PUBLISHED',
    },
    create: {
      userId: attendee.id,
      eventId: soundscape.id,
      rating: 4,
      comment: 'Beautiful sound design and a warm room.',
      status: 'PUBLISHED',
    },
  });

  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: attendee.id,
      type: 'BOOKING_CONFIRMATION',
      title: 'Your development booking is confirmed',
    },
  });
  if (!existingNotification) {
    await prisma.notification.create({
      data: {
        userId: attendee.id,
        type: 'BOOKING_CONFIRMATION',
        title: 'Your development booking is confirmed',
        body: 'This notification was created by the development seed.',
        data: { bookingNumber: 'DEV-FREE-0001' },
      },
    });
  }

  console.log('Aayojak development seed completed.');
  console.log('DEVELOPMENT ONLY accounts:');
  console.log('  admin.dev@aayojak.local');
  console.log('  organizer.dev@aayojak.local');
  console.log('  user.dev@aayojak.local');
  console.log(`  password: ${DEVELOPMENT_PASSWORD}`);
  console.log(`  paid ticket tier: ${summitTier.name} (${summitTier.price.toString()} NPR)`);
  console.log(`  free event: ${wellnessWalk.id}`);
}

main()
  .catch((error: unknown) => {
    console.error('Aayojak development seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
