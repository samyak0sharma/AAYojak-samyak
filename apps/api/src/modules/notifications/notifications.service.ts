import { prisma } from '../../lib/prisma.js';
import { pagination } from '../../lib/http.js';

export async function listNotifications(userId: string, page: number, limit: number, unreadOnly: boolean) {
  const where = { userId, ...(unreadOnly ? { readAt: null } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, type: true, title: true, body: true, data: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where }),
  ]);
  return { items, pagination: pagination(page, limit, total) };
}

