import prisma from '../config/prisma';
import { AuditAction } from '@prisma/client';

interface AuditLogData {
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const createAuditLog = async (data: AuditLogData) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        userEmail: data.userEmail,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

export const getAuditLogs = async (
  page = 1,
  limit = 20,
  action?: string,
  userId?: string,
  startDate?: Date,
  endDate?: Date
) => {
  const where: any = {};

  if (action) {
    where.action = action;
  }

  if (userId) {
    where.userId = userId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
