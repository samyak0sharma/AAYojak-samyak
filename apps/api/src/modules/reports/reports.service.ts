import { Prisma, type ReportStatus, type ReportTargetType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, pagination } from '../../lib/http.js';

const reportSelect = {
  id: true, targetType: true, targetId: true, reason: true, description: true,
  status: true, resolutionNote: true, resolvedAt: true, createdAt: true, updatedAt: true,
  reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
  resolvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.ReportSelect;

async function assertTargetExists(targetType: ReportTargetType, targetId: string) {
  const exists = targetType === 'EVENT' ? await prisma.event.count({ where: { id: targetId } }) : targetType === 'ORGANIZER' ? await prisma.organizer.count({ where: { id: targetId } }) : targetType === 'REVIEW' ? await prisma.review.count({ where: { id: targetId } }) : await prisma.user.count({ where: { id: targetId } });
  if (!exists) throw new AppError(404, 'REPORT_TARGET_NOT_FOUND', 'The resource being reported was not found.');
}

export async function createReport(reporterId: string, input: { targetType: ReportTargetType; targetId: string; reason: string; description: string }) {
  await assertTargetExists(input.targetType, input.targetId);
  return prisma.report.create({ data: { reporterId, ...input }, select: reportSelect });
}

export async function listMyReports(reporterId: string, page: number, limit: number) {
  const where = { reporterId };
  const [items, total] = await prisma.$transaction([prisma.report.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: reportSelect }), prisma.report.count({ where })]);
  return { items, pagination: pagination(page, limit, total) };
}

export async function listReports(page: number, limit: number, status?: ReportStatus, targetType?: ReportTargetType) {
  const where: Prisma.ReportWhereInput = { ...(status ? { status } : {}), ...(targetType ? { targetType } : {}) };
  const [items, total] = await prisma.$transaction([prisma.report.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit, select: reportSelect }), prisma.report.count({ where })]);
  return { items, pagination: pagination(page, limit, total) };
}

export async function updateReport(id: string, resolverId: string, input: { status: ReportStatus; resolutionNote?: string | null }) {
  const report = await prisma.report.findUnique({ where: { id }, select: { id: true } });
  if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'The requested report was not found.');
  const resolved = input.status === 'RESOLVED' || input.status === 'REJECTED';
  return prisma.report.update({ where: { id }, data: { status: input.status, resolutionNote: input.resolutionNote ?? null, resolvedById: resolved ? resolverId : null, resolvedAt: resolved ? new Date() : null }, select: reportSelect });
}
