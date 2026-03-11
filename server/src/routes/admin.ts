import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { validate, uuidParam } from '../middleware/validation';
import logger from '../utils/logger';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

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
    const skip = (page - 1) * limit;

    const tripWhere: any = {};
    if (action) tripWhere.purpose = action;
    if (userId) tripWhere.userId = userId;

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where: Object.keys(tripWhere).length > 0 ? tripWhere : undefined,
        include: {
          user: { select: { id: true, name: true, email: true } },
          vehicle: { select: { id: true, registrationNumber: true } },
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trip.count({ where: Object.keys(tripWhere).length > 0 ? tripWhere : undefined }),
    ]);

    const auditLogs = trips.map((trip: any) => ({
      id: trip.id,
      action: 'trip_' + (trip.endTime ? 'completed' : 'started'),
      user: trip.user,
      details: {
        vehicle: trip.vehicle?.registrationNumber,
        destination: trip.destination,
        mileage: trip.mileageDriven,
        purpose: trip.purpose,
      },
      timestamp: trip.startTime,
    }));

    res.json({
      success: true,
      data: {
        logs: auditLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Admin audit log error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get audit log' });
  }
});

export default router;
