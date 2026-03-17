import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { validate, serviceValidation, uuidParam } from '../middleware/validation';
import logger from '../utils/logger';
import { emitServiceReminder, emitVehicleStatus } from '../index';

const router = Router();

router.post('/', authMiddleware, adminMiddleware, validate(serviceValidation), async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, serviceType, mileageAtService, notes } = req.body;

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });

    const serviceLog = await prisma.serviceLog.create({
      data: {
        vehicleId,
        serviceType: serviceType.trim(),
        mileageAtService,
        notes: notes?.trim() || null,
      },
    });

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        lastServiceMileage: mileageAtService,
      },
    });

    const milesUntilService = (vehicle?.serviceInterval || 10000) - (mileageAtService - (vehicle?.lastServiceMileage || 0));
    if (milesUntilService <= 500) {
      emitServiceReminder(vehicleId, `Service due soon for ${vehicle?.registrationNumber}: ${milesUntilService} miles remaining`);
    }

    emitVehicleStatus(vehicleId, vehicle?.status || 'available', req.user!.email);

    res.status(201).json({ success: true, data: serviceLog });
  } catch (error) {
    logger.error('Create service error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to create service log' });
  }
});

router.get('/vehicle/:vehicleId', authMiddleware, validate(uuidParam), async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = String(req.params.vehicleId);
    const serviceLogs = await prisma.serviceLog.findMany({
      where: { vehicleId },
      orderBy: { performedAt: 'desc' },
    });
    res.json({ success: true, data: serviceLogs });
  } catch (error) {
    logger.error('Get service logs error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get service logs' });
  }
});

router.get('/upcoming', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany();

    const upcomingService = vehicles
      .map((vehicle: any) => ({
        ...vehicle,
        milesUntilService: vehicle.serviceInterval - (vehicle.currentMileage - vehicle.lastServiceMileage),
      }))
      .filter((v: any) => v.milesUntilService <= 500)
      .sort((a: any, b: any) => a.milesUntilService - b.milesUntilService);

    res.json({ success: true, data: upcomingService });
  } catch (error) {
    logger.error('Get upcoming services error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get upcoming services' });
  }
});

export default router;
