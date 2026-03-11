import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware } from '../middleware/auth';
import { validate, uuidParam } from '../middleware/validation';
import logger from '../utils/logger';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 20;
    const type = (req.query.type as string || '').slice(0, 50);
    
    page = Math.max(1, Math.min(page, 50));
    limit = Math.max(1, Math.min(limit, 50));
    const skip = (page - 1) * limit;

    const where: any = { userId: req.user!.userId };
    if (type && ['checkout', 'checkin', 'service_reminder'].includes(type)) {
      where.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.userId, read: false } }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        unreadCount,
      },
    });
  } catch (error) {
    logger.error('Get notifications error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
});

router.delete('/:id', authMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({
      where: { id: id as string },
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    if (notification.userId !== req.user!.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    await prisma.notification.delete({
      where: { id: id as string },
    });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    logger.error('Delete notification error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

router.put('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({
      where: { id: id as string },
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    if (notification.userId !== req.user!.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    const updated = await prisma.notification.update({
      where: { id: id as string },
      data: { read: true },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Mark read error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

router.put('/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, read: false },
      data: { read: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all read error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
  }
});

export default router;
