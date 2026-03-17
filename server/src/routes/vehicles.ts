import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { validate, vehicleValidation, uuidParam } from '../middleware/validation';
import logger from '../utils/logger';
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

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const vehiclesWithServiceStatus = vehicles.map((vehicle: any) => {
      const milesUntilService = vehicle.serviceInterval - (vehicle.currentMileage - vehicle.lastServiceMileage);
      return {
        ...vehicle,
        milesUntilService,
        needsService: milesUntilService <= 500,
      };
    });

    res.json({ success: true, data: vehiclesWithServiceStatus });
  } catch (error) {
    logger.error('Get vehicles error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get vehicles' });
  }
});

router.get('/:id', authMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        trips: { orderBy: { startTime: 'desc' }, take: 10 },
        serviceLogs: { orderBy: { performedAt: 'desc' }, take: 10 },
      },
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    const milesUntilService = vehicle.serviceInterval - (vehicle.currentMileage - vehicle.lastServiceMileage);
    res.json({
      success: true,
      data: {
        ...vehicle,
        milesUntilService,
        needsService: milesUntilService <= 500,
      },
    });
  } catch (error) {
    logger.error('Get vehicle error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get vehicle' });
  }
});

router.post('/', authMiddleware, adminMiddleware, validate(vehicleValidation), async (req: AuthRequest, res: Response) => {
  try {
    const { registrationNumber, make, model, currentMileage, serviceInterval } = req.body;

    const existing = await prisma.vehicle.findUnique({ where: { registrationNumber } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Registration number already exists' });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber: registrationNumber.toUpperCase(),
        make,
        model,
        currentMileage: currentMileage || 0,
        serviceInterval: serviceInterval || 10000,
        lastServiceMileage: currentMileage || 0,
      },
    });

    await logAudit(req, 'VEHICLE_CREATE', 'Vehicle', vehicle.id, { 
      registrationNumber: vehicle.registrationNumber, 
      make, 
      model 
    });

    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    logger.error('Create vehicle error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to create vehicle' });
  }
});

router.put('/:id', authMiddleware, adminMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { make, model, currentMileage, serviceInterval, status } = req.body;

    const beforeVehicle = await prisma.vehicle.findUnique({ where: { id } });
    const changes: Record<string, { old: any; new: any }> = {};
    
    if (make && make !== beforeVehicle?.make) changes.make = { old: beforeVehicle?.make, new: make };
    if (model && model !== beforeVehicle?.model) changes.model = { old: beforeVehicle?.model, new: model };
    if (currentMileage && currentMileage !== beforeVehicle?.currentMileage) changes.currentMileage = { old: beforeVehicle?.currentMileage, new: currentMileage };
    if (serviceInterval && serviceInterval !== beforeVehicle?.serviceInterval) changes.serviceInterval = { old: beforeVehicle?.serviceInterval, new: serviceInterval };
    if (status && status !== beforeVehicle?.status) changes.status = { old: beforeVehicle?.status, new: status };

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(make && { make }),
        ...(model && { model }),
        ...(currentMileage && { currentMileage }),
        ...(serviceInterval && { serviceInterval }),
        ...(status && { status }),
      },
    });

    await logAudit(req, 'VEHICLE_UPDATE', 'Vehicle', id, { changes });

    res.json({ success: true, data: vehicle });
  } catch (error) {
    logger.error('Update vehicle error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update vehicle' });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    await prisma.vehicle.delete({ where: { id } });
    
    await logAudit(req, 'VEHICLE_DELETE', 'Vehicle', id, { 
      registrationNumber: vehicle?.registrationNumber,
      make: vehicle?.make,
      model: vehicle?.model
    });
    
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (error) {
    logger.error('Delete vehicle error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to delete vehicle' });
  }
});

router.get('/:id/full', authMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        trips: { 
          orderBy: { startTime: 'desc' }, 
          take: 50,
          include: { user: { select: { id: true, name: true } } }
        },
        serviceLogs: { orderBy: { performedAt: 'desc' }, take: 20 },
      },
    } as any) as any;

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    const milesUntilService = vehicle.serviceInterval - (vehicle.currentMileage - vehicle.lastServiceMileage);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const insuranceExpiring = vehicle.insuranceExpiry && new Date(vehicle.insuranceExpiry) <= thirtyDaysFromNow;
    const registrationExpiring = vehicle.registrationExpiry && new Date(vehicle.registrationExpiry) <= thirtyDaysFromNow;

    const totalTrips = vehicle.trips.length;
    const totalMileage = vehicle.trips.reduce((sum: number, trip: any) => sum + (trip.mileageDriven || 0), 0);

    res.json({
      success: true,
      data: {
        ...vehicle,
        milesUntilService,
        needsService: milesUntilService <= 500,
        insuranceExpiring,
        registrationExpiring,
        totalTrips,
        totalMileage,
      },
    });
  } catch (error) {
    logger.error('Get full vehicle error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get vehicle details' });
  }
});

router.put('/:id/assign', authMiddleware, adminMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { assignedUserId } = req.body;

    if (assignedUserId !== null && assignedUserId !== undefined) {
      const user = await prisma.user.findUnique({ where: { id: assignedUserId } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: { assignedUserId: assignedUserId || null } as any,
      include: { assignedUser: { select: { id: true, name: true, email: true } } },
    } as any) as any;

    res.json({ success: true, data: vehicle });
  } catch (error) {
    logger.error('Assign vehicle error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to assign vehicle' });
  }
});

router.get('/expiring', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.max(1, Math.min(parseInt(req.query.days as string) || 30, 365));
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const vehicles = await prisma.vehicle.findMany({
      orderBy: { registrationNumber: 'asc' },
    });

    const expiring = vehicles.filter((vehicle: any) => {
      const insuranceExpiring = vehicle.insuranceExpiry && new Date(vehicle.insuranceExpiry) <= futureDate;
      const registrationExpiring = vehicle.registrationExpiry && new Date(vehicle.registrationExpiry) <= futureDate;
      return insuranceExpiring || registrationExpiring;
    }).map((vehicle: any) => {
      const insuranceExpiring = vehicle.insuranceExpiry && new Date(vehicle.insuranceExpiry) <= futureDate;
      const registrationExpiring = vehicle.registrationExpiry && new Date(vehicle.registrationExpiry) <= futureDate;
      return {
        ...vehicle,
        insuranceExpiring,
        registrationExpiring,
        insuranceDaysLeft: vehicle.insuranceExpiry ? Math.ceil((new Date(vehicle.insuranceExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        registrationDaysLeft: vehicle.registrationExpiry ? Math.ceil((new Date(vehicle.registrationExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      };
    });

    res.json({ success: true, data: expiring });
  } catch (error) {
    logger.error('Get expiring vehicles error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get expiring vehicles' });
  }
});

export default router;
