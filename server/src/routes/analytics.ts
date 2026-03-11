import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.use(authMiddleware);

router.get('/trips-by-month', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let months = parseInt(req.query.months as string) || 6;
    months = Math.max(1, Math.min(months, 24));
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const trips = await prisma.trip.findMany({
      where: {
        startTime: { gte: startDate },
      },
      select: {
        startTime: true,
        id: true,
        mileageDriven: true,
        purpose: true,
      } as any,
    }) as any;

    const monthlyData: Record<string, { month: string; trips: number; mileage: number }> = {};

    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[monthKey] = { month: monthName, trips: 0, mileage: 0 };
    }

    trips.forEach((trip: any) => {
      const date = new Date(trip.startTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].trips += 1;
        monthlyData[monthKey].mileage += trip.mileageDriven || 0;
      }
    });

    const result = Object.values(monthlyData).reverse();

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Trips by month error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
});

router.get('/mileage-by-vehicle', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      select: {
        id: true,
        registrationNumber: true,
        currentMileage: true,
      },
    });

    const trips = await prisma.trip.findMany({
      where: {
        endTime: { not: null },
      },
      select: {
        vehicleId: true,
        mileageDriven: true,
      },
    });

    const mileageByVehicle = vehicles.map((vehicle) => {
      const vehicleTrips = trips.filter((t) => t.vehicleId === vehicle.id);
      const totalMileage = vehicleTrips.reduce((sum, t) => sum + (t.mileageDriven || 0), 0);
      return {
        vehicleId: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        totalMileage,
        currentMileage: vehicle.currentMileage,
      };
    }).sort((a, b) => b.totalMileage - a.totalMileage);

    res.json({ success: true, data: mileageByVehicle });
  } catch (error) {
    logger.error('Mileage by vehicle error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get mileage data' });
  }
});

router.get('/cost-summary', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let days = parseInt(req.query.days as string) || 30;
    days = Math.max(1, Math.min(days, 365));
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    const currentTrips = await prisma.trip.findMany({
      where: {
        startTime: { gte: startDate },
        endTime: { not: null },
      },
      select: {
        expenses: true,
        mileageDriven: true,
        purpose: true,
      } as any,
    }) as any;

    const previousTrips = await prisma.trip.findMany({
      where: {
        startTime: { gte: previousStartDate, lt: startDate },
        endTime: { not: null },
      },
      select: {
        expenses: true,
        mileageDriven: true,
      } as any,
    }) as any;

    const currentExpenses = currentTrips.reduce((sum: number, t: any) => sum + (t.expenses || 0), 0);
    const previousExpenses = previousTrips.reduce((sum: number, t: any) => sum + (t.expenses || 0), 0);

    const currentMileage = currentTrips.reduce((sum: number, t: any) => sum + (t.mileageDriven || 0), 0);
    const previousMileage = previousTrips.reduce((sum: number, t: any) => sum + (t.mileageDriven || 0), 0);

    const totalExpenses = currentTrips.reduce((sum: number, t: any) => sum + (t.expenses || 0), 0);
    const businessTrips = currentTrips.filter((t: any) => t.purpose === 'business');
    const personalTrips = currentTrips.filter((t: any) => t.purpose === 'personal');
    const maintenanceTrips = currentTrips.filter((t: any) => t.purpose === 'maintenance');

    const businessExpenses = businessTrips.reduce((sum: number, t: any) => sum + (t.expenses || 0), 0);
    const personalExpenses = personalTrips.reduce((sum: number, t: any) => sum + (t.expenses || 0), 0);

    const expenseChange = previousExpenses > 0 
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 
      : 0;
    
    const mileageChange = previousMileage > 0 
      ? ((currentMileage - previousMileage) / previousMileage) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        totalExpenses,
        businessExpenses,
        personalExpenses,
        totalMileage: currentMileage,
        tripCount: currentTrips.length,
        expenseChange: Math.round(expenseChange * 10) / 10,
        mileageChange: Math.round(mileageChange * 10) / 10,
        byPurpose: {
          business: businessTrips.length,
          personal: personalTrips.length,
          maintenance: maintenanceTrips.length,
        },
      },
    });
  } catch (error) {
    logger.error('Cost summary error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get cost summary' });
  }
});

router.get('/utilization', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      select: {
        id: true,
        registrationNumber: true,
        status: true,
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trips = await prisma.trip.findMany({
      where: {
        startTime: { gte: thirtyDaysAgo },
      },
      select: {
        vehicleId: true,
        endTime: true,
      },
    });

    const utilization = vehicles.map((vehicle) => {
      const vehicleTrips = trips.filter((t) => t.vehicleId === vehicle.id && t.endTime);
      const tripCount = vehicleTrips.length;
      const utilizationPercent = Math.round((tripCount / 30) * 100);
      return {
        vehicleId: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        status: vehicle.status,
        tripCount,
        utilizationPercent: Math.min(utilizationPercent, 100),
      };
    });

    const availableCount = vehicles.filter((v) => v.status === 'available').length;
    const outCount = vehicles.filter((v) => v.status === 'out').length;

    res.json({
      success: true,
      data: {
        vehicles: utilization,
        summary: {
          total: vehicles.length,
          available: availableCount,
          out: outCount,
          avgUtilization: utilization.length > 0
            ? Math.round(utilization.reduce((sum, v) => sum + v.utilizationPercent, 0) / utilization.length)
            : 0,
        },
      },
    });
  } catch (error) {
    logger.error('Utilization error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get utilization data' });
  }
});

export default router;
