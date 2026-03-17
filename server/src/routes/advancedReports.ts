import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/cost-per-mile', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, vehicleId } = req.query;

    const where: any = { endTime: { not: null } };
    if (vehicleId) where.vehicleId = vehicleId;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    const trips = await prisma.trip.findMany({
      where,
      include: {
        vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
      },
    });

    const vehicleStats = trips.reduce((acc: any, trip: any) => {
      const vid = trip.vehicleId;
      if (!acc[vid]) {
        acc[vid] = {
          vehicle: trip.vehicle,
          totalMiles: 0,
          totalExpenses: 0,
          totalFuelCost: 0,
          tripCount: 0,
        };
      }
      acc[vid].totalMiles += trip.mileageDriven || 0;
      acc[vid].totalExpenses += trip.expenses || 0;
      acc[vid].totalFuelCost += trip.fuelCost || 0;
      acc[vid].tripCount += 1;
      return acc;
    }, {});

    const result = Object.values(vehicleStats).map((v: any) => ({
      ...v,
      costPerMile: v.totalMiles > 0 ? (v.totalExpenses + v.totalFuelCost) / v.totalMiles : 0,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Cost per mile report error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

router.get('/fuel-efficiency', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = { endTime: { not: null } };
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    const trips = await prisma.trip.findMany({
      where,
      include: {
        vehicle: { select: { id: true, registrationNumber: true, fuelEfficiency: true } },
      },
    });

    const fuelStats = trips.reduce((acc: any, trip: any) => {
      const vid = trip.vehicleId;
      if (!acc[vid]) {
        acc[vid] = {
          vehicle: trip.vehicle,
          totalMiles: 0,
          totalFuelCost: 0,
          tripCount: 0,
        };
      }
      acc[vid].totalMiles += trip.mileageDriven || 0;
      acc[vid].totalFuelCost += trip.fuelCost || 0;
      acc[vid].tripCount += 1;
      return acc;
    }, {});

    const result = Object.values(fuelStats).map((v: any) => ({
      ...v,
      avgFuelCostPerMile: v.totalMiles > 0 ? v.totalFuelCost / v.totalMiles : 0,
      projectedMPG: v.totalFuelCost > 0 ? (v.totalMiles / v.totalFuelCost) * 10 : 0,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Fuel efficiency report error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

router.get('/depreciation', async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { purchasePrice: { not: null } },
    });

    const result = vehicles.map(v => {
      const ageInYears = v.purchaseDate 
        ? (Date.now() - new Date(v.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        : 0;
      const depreciationRate = v.depreciationRate || 15;
      const currentVal = v.purchasePrice! * Math.pow(1 - depreciationRate / 100, ageInYears);
      const totalDepreciation = v.purchasePrice! - currentVal;

      return {
        vehicle: {
          id: v.id,
          registrationNumber: v.registrationNumber,
          make: v.make,
          model: v.model,
          year: v.year,
        },
        purchasePrice: v.purchasePrice,
        currentValue: currentVal,
        totalDepreciation,
        depreciationRate,
        ageInYears: Math.round(ageInYears * 10) / 10,
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Depreciation report error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

router.get('/maintenance-costs', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, vehicleId } = req.query;

    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (startDate || endDate) {
      where.performedAt = {};
      if (startDate) where.performedAt.gte = new Date(startDate as string);
      if (endDate) where.performedAt.lte = new Date(endDate as string);
    }

    const services = await prisma.serviceLog.findMany({
      where,
      include: {
        vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
      },
      orderBy: { performedAt: 'desc' },
    });

    const totalCost = services.reduce((sum, s) => sum + (s.cost || 0), 0);
    const byVehicle = services.reduce((acc: any, s) => {
      const vid = s.vehicleId;
      if (!acc[vid]) {
        acc[vid] = { vehicle: s.vehicle, totalCost: 0, serviceCount: 0, services: [] };
      }
      acc[vid].totalCost += s.cost || 0;
      acc[vid].serviceCount += 1;
      return acc;
    }, {});

    res.json({ 
      success: true, 
      data: {
        services,
        byVehicle: Object.values(byVehicle),
        totalCost,
        serviceCount: services.length,
      },
    });
  } catch (error) {
    logger.error('Maintenance costs report error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

router.get('/driver-performance', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = { endTime: { not: null } };
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    const trips = await prisma.trip.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, rating: true } },
        vehicle: { select: { id: true, registrationNumber: true } },
      },
    });

    const driverStats = trips.reduce((acc: any, trip: any) => {
      const uid = trip.userId;
      if (!acc[uid]) {
        acc[uid] = {
          driver: trip.user,
          totalTrips: 0,
          totalMiles: 0,
          totalExpenses: 0,
          totalFuelCost: 0,
          ratings: [],
        };
      }
      acc[uid].totalTrips += 1;
      acc[uid].totalMiles += trip.mileageDriven || 0;
      acc[uid].totalExpenses += trip.expenses || 0;
      acc[uid].totalFuelCost += trip.fuelCost || 0;
      if (trip.rating) acc[uid].ratings.push(trip.rating);
      return acc;
    }, {});

    const result = Object.values(driverStats).map((d: any) => ({
      ...d,
      avgRating: d.ratings.length > 0 ? d.ratings.reduce((a: number, b: number) => a + b, 0) / d.ratings.length : null,
      costPerMile: d.totalMiles > 0 ? (d.totalExpenses + d.totalFuelCost) / d.totalMiles : 0,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Driver performance report error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

export default router;
