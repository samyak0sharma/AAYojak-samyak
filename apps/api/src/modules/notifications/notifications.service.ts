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

export async function markNotificationRead(userId: string, id: string) {
  const result = await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  if (result.count === 0) return { updated: false };
  return { updated: true };
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return { updated: result.count };
}
