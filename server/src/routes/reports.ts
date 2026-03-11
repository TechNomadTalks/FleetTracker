import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import PDFDocument from 'pdfkit';
import logger from '../utils/logger';

const router = Router();

const parseDateRange = (query: any) => {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (query.startDate) {
    startDate = new Date(query.startDate);
  }
  if (query.endDate) {
    endDate = new Date(query.endDate);
  }

  return { startDate, endDate };
};

router.get('/mileage', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    const where: any = {};
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }

    const vehicles = await prisma.vehicle.findMany({
      include: {
        trips: {
          where: {
            ...where,
            endTime: { not: null },
          },
        },
      },
    });

    const csvData = vehicles.map((vehicle: any) => {
      const totalMiles = vehicle.trips.reduce((sum: number, trip: any) => sum + (trip.mileageDriven || 0), 0);
      return {
        registrationNumber: vehicle.registrationNumber,
        make: vehicle.make,
        model: vehicle.model,
        currentMileage: vehicle.currentMileage,
        totalMilesDriven: totalMiles,
        status: vehicle.status,
      };
    });

    const headers = 'Registration,Make,Model,Current Mileage,Total Miles Driven,Status\n';
    const rows = csvData
      .map(
        (v: any) =>
          `${v.registrationNumber},${v.make},${v.model},${v.currentMileage},${v.totalMilesDriven},${v.status}`
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=mileage-report.csv');
    res.send(headers + rows);
  } catch (error) {
    logger.error('Mileage report error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to generate mileage report' });
  }
});

router.get('/mileage-pdf', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    const where: any = {};
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }

    const vehicles = await prisma.vehicle.findMany({
      include: {
        trips: {
          where: {
            ...where,
            endTime: { not: null },
          },
        },
      },
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=mileage-report.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Mileage Report', { align: 'center' });
    doc.moveDown();
    
    const dateRange = startDate && endDate 
      ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
      : 'All Time';
    doc.fontSize(12).text(`Date Range: ${dateRange}`, { align: 'center' });
    doc.moveDown(2);

    let grandTotal = 0;

    vehicles.forEach((vehicle: any) => {
      const totalMiles = vehicle.trips.reduce((sum: number, trip: any) => sum + (trip.mileageDriven || 0), 0);
      grandTotal += totalMiles;

      doc.fontSize(14).text(`${vehicle.registrationNumber} - ${vehicle.make} ${vehicle.model}`);
      doc.fontSize(10).text(`Current Mileage: ${vehicle.currentMileage.toLocaleString()} mi`);
      doc.text(`Total Miles Driven: ${totalMiles.toLocaleString()} mi`);
      doc.text(`Status: ${vehicle.status}`);
      doc.moveDown();
    });

    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(12).text(`Grand Total: ${grandTotal.toLocaleString()} miles`);
    doc.font('Helvetica').fontSize(10);

    doc.end();
  } catch (error) {
    logger.error('Mileage PDF report error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to generate PDF report' });
  }
});

router.get('/user-activity', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    const where: any = {};
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }

    const users = await prisma.user.findMany({
      include: {
        trips: {
          where: {
            ...where,
            endTime: { not: null },
          },
          include: { vehicle: true },
        },
      },
    });

    const csvData = users.map((user: any) => ({
      name: user.name,
      email: user.email,
      role: user.role,
      totalTrips: user.trips.length,
      totalMiles: user.trips.reduce((sum: number, trip: any) => sum + (trip.mileageDriven || 0), 0),
    }));

    const headers = 'Name,Email,Role,Total Trips,Total Miles\n';
    const rows = csvData
      .map((u: any) => `${u.name},${u.email},${u.role},${u.totalTrips},${u.totalMiles}`)
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=user-activity-report.csv');
    res.send(headers + rows);
  } catch (error) {
    logger.error('User activity report error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to generate user activity report' });
  }
});

router.get('/user-activity-pdf', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    const where: any = {};
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }

    const users = await prisma.user.findMany({
      include: {
        trips: {
          where: {
            ...where,
            endTime: { not: null },
          },
          include: { vehicle: true },
        },
      },
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=user-activity-report.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('User Activity Report', { align: 'center' });
    doc.moveDown();
    
    const dateRange = startDate && endDate 
      ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
      : 'All Time';
    doc.fontSize(12).text(`Date Range: ${dateRange}`, { align: 'center' });
    doc.moveDown(2);

    let grandTotalTrips = 0;
    let grandTotalMiles = 0;

    users.forEach((user: any) => {
      const totalTrips = user.trips.length;
      const totalMiles = user.trips.reduce((sum: number, trip: any) => sum + (trip.mileageDriven || 0), 0);
      grandTotalTrips += totalTrips;
      grandTotalMiles += totalMiles;

      doc.fontSize(14).text(user.name);
      doc.fontSize(10).text(`Email: ${user.email}`);
      doc.text(`Role: ${user.role}`);
      doc.text(`Total Trips: ${totalTrips}`);
      doc.text(`Total Miles: ${totalMiles.toLocaleString()} mi`);
      doc.moveDown();
    });

    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(12).text(`Summary: ${grandTotalTrips} trips, ${grandTotalMiles.toLocaleString()} miles total`);
    doc.font('Helvetica').fontSize(10);

    doc.end();
  } catch (error) {
    logger.error('User activity PDF report error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to generate PDF report' });
  }
});

export default router;
