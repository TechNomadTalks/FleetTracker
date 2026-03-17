import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { validate, uuidParam } from '../middleware/validation';
import logger from '../utils/logger';
import { createAuditLog } from '../services/audit';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, serviceType, description, scheduledDate, mileageDue, recurring, recurringIntervalDays, cost } = req.body;

    const scheduled = await prisma.scheduledService.create({
      data: {
        vehicleId,
        serviceType,
        description,
        scheduledDate: new Date(scheduledDate),
        mileageDue,
        recurring,
        recurringIntervalDays,
        cost,
      },
    });

    await createAuditLog({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'SERVICE_CREATE',
      targetType: 'ScheduledService',
      targetId: scheduled.id,
      details: { vehicleId, serviceType, scheduledDate },
      ipAddress: req.ip || (req as any).socket?.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ success: true, data: scheduled });
  } catch (error) {
    logger.error('Create scheduled service error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to create scheduled service' });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, status, startDate, endDate } = req.query;

    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate as string);
      if (endDate) where.scheduledDate.lte = new Date(endDate as string);
    }

    const services = await prisma.scheduledService.findMany({
      where,
      include: { vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } } },
      orderBy: { scheduledDate: 'asc' },
    });

    res.json({ success: true, data: services });
  } catch (error) {
    logger.error('Get scheduled services error', { error: error instanceof Error ? error.message: String(error) });
    res.status(500).json({ success: false, error: 'Failed to get scheduled services' });
  }
});

router.put('/:id', validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { serviceType, description, scheduledDate, mileageDue, recurring, recurringIntervalDays, cost, status } = req.body;

    const scheduled = await prisma.scheduledService.update({
      where: { id },
      data: {
        ...(serviceType && { serviceType }),
        ...(description !== undefined && { description }),
        ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
        ...(mileageDue !== undefined && { mileageDue }),
        ...(recurring !== undefined && { recurring }),
        ...(recurringIntervalDays !== undefined && { recurringIntervalDays }),
        ...(cost !== undefined && { cost }),
        ...(status && { status }),
        ...(status === 'completed' && { completedAt: new Date() }),
      },
    });

    res.json({ success: true, data: scheduled });
  } catch (error) {
    logger.error('Update scheduled service error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update scheduled service' });
  }
});

router.delete('/:id', validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.scheduledService.delete({ where: { id } });
    res.json({ success: true, message: 'Scheduled service deleted' });
  } catch (error) {
    logger.error('Delete scheduled service error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to delete scheduled service' });
  }
});

router.get('/upcoming', async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const services = await prisma.scheduledService.findMany({
      where: {
        scheduledDate: { lte: futureDate },
        status: 'scheduled',
      },
      include: { vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } } },
      orderBy: { scheduledDate: 'asc' },
      take: 20,
    });

    res.json({ success: true, data: services });
  } catch (error) {
    logger.error('Get upcoming services error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get upcoming services' });
  }
});

export default router;
