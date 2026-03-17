import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import logger from '../utils/logger';
import { createAuditLog } from '../services/audit';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/vehicles/bulk-delete', async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid IDs array' });
    }

    if (ids.length > 100) {
      return res.status(400).json({ success: false, error: 'Cannot delete more than 100 items at once' });
    }

    const result = await prisma.vehicle.deleteMany({
      where: { id: { in: ids } },
    });

    await createAuditLog({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'VEHICLE_DELETE',
      targetType: 'BulkDelete',
      details: { count: result.count, ids },
      ipAddress: req.ip || (req as any).socket?.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, data: { deleted: result.count } });
  } catch (error) {
    logger.error('Bulk delete error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to delete vehicles' });
  }
});

router.post('/vehicles/bulk-assign', async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleIds, assignedUserId } = req.body;

    if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid vehicle IDs array' });
    }

    if (vehicleIds.length > 100) {
      return res.status(400).json({ success: false, error: 'Cannot assign more than 100 vehicles at once' });
    }

    const result = await prisma.vehicle.updateMany({
      where: { id: { in: vehicleIds } },
      data: { assignedUserId: assignedUserId || null },
    });

    await createAuditLog({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'VEHICLE_UPDATE',
      targetType: 'BulkAssign',
      details: { count: result.count, assignedUserId },
      ipAddress: req.ip || (req as any).socket?.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, data: { updated: result.count } });
  } catch (error) {
    logger.error('Bulk assign error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to assign vehicles' });
  }
});

router.post('/vehicles/bulk-update', async (req: AuthRequest, res: Response) => {
  try {
    const { ids, data } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid IDs array' });
    }

    if (ids.length > 100) {
      return res.status(400).json({ success: false, error: 'Cannot update more than 100 items at once' });
    }

    const allowedFields = ['status', 'serviceInterval', 'fuelType', 'fuelEfficiency', 'insuranceExpiry', 'registrationExpiry'];
    const updateData: any = {};
    
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const result = await prisma.vehicle.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    await createAuditLog({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'VEHICLE_UPDATE',
      targetType: 'BulkUpdate',
      details: { count: result.count, fields: Object.keys(updateData) },
      ipAddress: req.ip || (req as any).socket?.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, data: { updated: result.count } });
  } catch (error) {
    logger.error('Bulk update error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update vehicles' });
  }
});

export default router;
