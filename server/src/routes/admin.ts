import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { validate, uuidParam } from '../middleware/validation';
import logger from '../utils/logger';
import { createAuditLog, getAuditLogs } from '../services/audit';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

const logAudit = async (req: AuthRequest, action: any, targetType: string, targetId?: string, details?: any) => {
  await createAuditLog({
    userId: req.user?.userId,
    userEmail: req.user?.email,
    action,
    targetType,
    targetId,
    details,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  });
};

router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string || '').slice(0, 100);
    
    page = Math.max(1, Math.min(page, 100));
    limit = Math.max(1, Math.min(limit, 50));
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as any } },
        { email: { contains: search, mode: 'insensitive' as any } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailNotifications: true,
          isActive: true,
          createdAt: true,
          _count: { select: { trips: true } },
        } as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Admin get users error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
});

router.put('/users/:id', validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { email, NOT: { id: id as string } },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }

    const beforeUser = await prisma.user.findUnique({ where: { id: id as string } });
    const changes: Record<string, { old: any; new: any }> = {};
    
    if (name && name !== beforeUser?.name) {
      changes.name = { old: beforeUser?.name, new: name };
    }
    if (email && email !== beforeUser?.email) {
      changes.email = { old: beforeUser?.email, new: email };
    }
    if (role && role !== beforeUser?.role) {
      changes.role = { old: beforeUser?.role, new: role };
    }

    const user = await prisma.user.update({
      where: { id: id as string },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
      } as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailNotifications: true,
        isActive: true,
        createdAt: true,
      } as any,
    });

    await logAudit(req, 'USER_UPDATE', 'User', id, { changes });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Admin update user error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

router.put('/users/:id/deactivate', validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: id as string } });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (targetUser.id === req.user?.userId) {
      return res.status(400).json({ success: false, error: 'Cannot deactivate yourself' });
    }

    const user = await prisma.user.update({
      where: { id: id as string },
      data: { isActive } as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      } as any,
    });

    await logAudit(
      req, 
      isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE', 
      'User', 
      id, 
      { deactivated: !isActive, email: targetUser.email, name: targetUser.name }
    );

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Admin deactivate user error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
});

router.get('/audit-log', async (req: AuthRequest, res: Response) => {
  try {
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 20;
    const action = (req.query.action as string || '').slice(0, 50);
    const userId = (req.query.userId as string || '').slice(0, 50);
    
    page = Math.max(1, Math.min(page, 100));
    limit = Math.max(1, Math.min(limit, 100));

    const result = await getAuditLogs(page, limit, action || undefined, userId || undefined);

    res.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    logger.error('Admin audit log error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get audit logs' });
  }
});

export default router;
