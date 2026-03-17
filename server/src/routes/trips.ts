import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware } from '../middleware/auth';
import { validate, checkoutValidation, checkinValidation, uuidParam } from '../middleware/validation';
import logger from '../utils/logger';
import { emitVehicleStatus, emitTripCreated, emitNotification } from '../index';
import { createAuditLog } from '../services/audit';

const router = Router();

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

router.post('/checkout', authMiddleware, validate(checkoutValidation), async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, destination, currentMileage, purpose, notes } = req.body;
    const userId = req.user!.userId;

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    if (vehicle.status === 'out') {
      return res.status(400).json({ success: false, error: 'Vehicle is already checked out' });
    }

    if (currentMileage < vehicle.currentMileage) {
      return res.status(400).json({
        success: false,
        error: `Starting mileage must be at least ${vehicle.currentMileage}`,
      });
    }

    const trip = await prisma.trip.create({
      data: {
        vehicleId,
        userId,
        destination: destination.trim(),
        startMileage: currentMileage,
        purpose: purpose || 'business',
        notes: notes || null,
      } as any,
    });

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'out' },
    });

    emitVehicleStatus(vehicleId, 'out', req.user!.email);

    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      const notification = await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'checkout',
          message: `${req.user!.email} checked out ${vehicle.registrationNumber} to ${destination}`,
        },
      });
      emitNotification(admin.id, notification);
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    emitTripCreated(trip, vehicle, user);

    await logAudit(req, 'TRIP_CHECKOUT', 'Trip', trip.id, { 
      vehicleId,
      registrationNumber: vehicle.registrationNumber,
      destination,
      purpose: purpose || 'business',
      startMileage: currentMileage
    });

    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    logger.error('Checkout error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Checkout failed' });
  }
});

router.post('/:id/checkin', authMiddleware, validate(checkinValidation), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { endMileage, expenses, notes } = req.body;
    const userId = req.user!.userId;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { vehicle: true },
    }) as any;

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    if (trip.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (trip.endTime) {
      return res.status(400).json({ success: false, error: 'Trip already completed' });
    }

    if (endMileage < trip.startMileage) {
      return res.status(400).json({ success: false, error: 'End mileage must be greater than start mileage' });
    }

    const mileageDriven = endMileage - trip.startMileage;

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        endMileage,
        mileageDriven,
        endTime: new Date(),
        expenses: expenses ? parseFloat(expenses) : null,
        notes: notes !== undefined ? notes : trip.notes,
      } as any,
    });

    await prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: {
        status: 'available',
        currentMileage: endMileage,
      },
    });

    emitVehicleStatus(trip.vehicleId, 'available', req.user!.email);

    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      const notification = await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'checkin',
          message: `${trip.vehicle?.registrationNumber || 'Vehicle'} returned - ${mileageDriven} miles driven`,
        },
      });
      emitNotification(admin.id, notification);
    }

    await logAudit(req, 'TRIP_CHECKIN', 'Trip', id, { 
      vehicleId: trip.vehicleId,
      registrationNumber: trip.vehicle?.registrationNumber,
      startMileage: trip.startMileage,
      endMileage,
      mileageDriven,
      expenses: expenses ? parseFloat(expenses) : null
    });

    res.json({ success: true, data: updatedTrip });
  } catch (error) {
    logger.error('Checkin error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Checkin failed' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';
    
    const where = isAdmin ? {} : { userId };
    
    const trips = await prisma.trip.findMany({
      where,
      include: { vehicle: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { startTime: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: trips });
  } catch (error) {
    logger.error('Get trips error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get trips' });
  }
});

router.get('/user/:userId', authMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = String(req.params.userId);
    const currentUserId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';

    if (!isAdmin && targetUserId !== currentUserId) {
      return res.status(403).json({ success: false, error: 'Not authorized to view other users trips' });
    }

    const trips = await prisma.trip.findMany({
      where: { userId: targetUserId },
      include: { vehicle: true },
      orderBy: { startTime: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: trips });
  } catch (error) {
    logger.error('Get user trips error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get user trips' });
  }
});

router.get('/vehicle/:vehicleId', authMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = String(req.params.vehicleId);
    const isAdmin = req.user!.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const trips = await prisma.trip.findMany({
      where: { vehicleId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { startTime: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: trips });
  } catch (error) {
    logger.error('Get vehicle trips error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get vehicle trips' });
  }
});

router.put('/:id', authMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { purpose, notes, expenses } = req.body;
    const userId = req.user!.userId;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    if (trip.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        ...(purpose && { purpose }),
        ...(notes !== undefined && { notes }),
        ...(expenses !== undefined && { expenses: expenses ? parseFloat(expenses) : null }),
      } as any,
    });

    res.json({ success: true, data: updatedTrip });
  } catch (error) {
    logger.error('Update trip error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update trip' });
  }
});

router.post('/:id/receipt', authMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { receipt } = req.body;
    const userId = req.user!.userId;

    if (!receipt || typeof receipt !== 'string') {
      return res.status(400).json({ success: false, error: 'Receipt data is required' });
    }

    const maxSize = 5 * 1024 * 1024;
    const decoded = Buffer.from(receipt, 'base64');
    
    if (decoded.length > maxSize) {
      return res.status(400).json({ success: false, error: 'Receipt file too large (max 5MB)' });
    }

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    if (trip.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: { receipt: decoded } as any,
    });

    res.json({ success: true, message: 'Receipt uploaded successfully' });
  } catch (error) {
    logger.error('Upload receipt error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to upload receipt' });
  }
});

router.get('/:id/receipt', authMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = req.user!.userId;

    const trip = await prisma.trip.findUnique({ 
      where: { id },
      select: { userId: true, receipt: true } as any
    }) as any;
    
    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    if (trip.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
    }

    if (!trip.receipt) {
      return res.status(404).json({ success: false, error: 'No receipt found' });
    }

    res.set('Content-Type', 'image/jpeg');
    res.send(trip.receipt);
  } catch (error) {
    logger.error('Download receipt error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to download receipt' });
  }
});

export default router;
