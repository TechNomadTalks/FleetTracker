import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const [totalVehicles, availableVehicles, totalTrips, totalUsers] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'available' } }),
      prisma.trip.count({ where: { endTime: { not: null } } }),
      prisma.user.count(),
    ]);

    const vehicles = await prisma.vehicle.findMany();
    const upcomingServices = vehicles.filter((v: any) => {
      const milesUntilService = v.serviceInterval - (v.currentMileage - v.lastServiceMileage);
      return milesUntilService <= 500;
    });

    res.json({
      success: true,
      data: {
        totalVehicles,
        availableVehicles,
        outVehicles: totalVehicles - availableVehicles,
        totalTrips,
        totalUsers,
        upcomingServicesCount: upcomingServices.length,
      },
    });
  } catch (error) {
    logger.error('Dashboard summary error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get dashboard summary' });
  }
});

router.get('/recent-trips', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';

    const where = isAdmin ? {} : { userId };

    const trips = await prisma.trip.findMany({
      where,
      include: {
        vehicle: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startTime: 'desc' },
      take: 10,
    });
    res.json({ success: true, data: trips });
  } catch (error) {
    logger.error('Recent trips error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get recent trips' });
  }
});

export default router;
