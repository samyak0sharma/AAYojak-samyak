import { prisma } from '../../lib/prisma.js';
import { pagination } from '../../lib/http.js';

export async function listCategories(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await prisma.$transaction([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: {
          select: {
            events: { where: { event: { status: 'PUBLISHED' } } },
          },
        },
      },
    }),
    prisma.category.count({ where: { isActive: true } }),
  ]);

  return { items, pagination: pagination(page, limit, total) };
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: {
        select: {
          events: { where: { event: { status: 'PUBLISHED' } } },
        },
      },
    },
  });
}
