import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/http.js';

export const safeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  phone: true,
  role: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
  organizer: {
    select: {
      id: true,
      name: true,
      slug: true,
      isApproved: true,
    },
  },
} satisfies Prisma.UserSelect;

export async function getSafeUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'The requested user was not found.');
  }

  return user;
}

export async function updateUser(id: string, input: Prisma.UserUpdateInput) {
  try {
    return await prisma.user.update({
      where: { id },
      data: input,
      select: safeUserSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError(404, 'USER_NOT_FOUND', 'The requested user was not found.');
    }
    throw error;
  }
}

