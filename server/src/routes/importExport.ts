import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import logger from '../utils/logger';
import { createAuditLog } from '../services/audit';
import fs from 'fs';
import path from 'path';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/import/vehicles', async (req: AuthRequest, res: Response) => {
  try {
    const { vehicles } = req.body;

    if (!Array.isArray(vehicles)) {
      return res.status(400).json({ success: false, error: 'Invalid data format' });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const v of vehicles) {
      try {
        await prisma.vehicle.upsert({
          where: { registrationNumber: v.registrationNumber },
          update: v,
          create: v,
        });
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push(`Failed to import ${v.registrationNumber}: ${e}`);
      }
    }

    await createAuditLog({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'VEHICLE_CREATE',
      targetType: 'BulkImport',
      details: { success: results.success, failed: results.failed },
      ipAddress: req.ip || (req as any).socket?.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Import vehicles error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to import vehicles' });
  }
});

router.post('/import/trips', async (req: AuthRequest, res: Response) => {
  try {
    const { trips } = req.body;

    if (!Array.isArray(trips)) {
      return res.status(400).json({ success: false, error: 'Invalid data format' });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const t of trips) {
      try {
        await prisma.trip.create({ data: t });
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push(`Failed to import trip: ${e}`);
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Import trips error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to import trips' });
  }
});

router.get('/export/vehicles', async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { assignedUser: { select: { name: true, email: true } } },
    });

    const csv = [
      'registrationNumber,make,model,year,vin,currentMileage,status,fuelType,fuelEfficiency,assignedTo',
      ...vehicles.map(v => 
        `${v.registrationNumber},${v.make},${v.model},${v.year || ''},${v.vin || ''},${v.currentMileage},${v.status},${v.fuelType || ''},${v.fuelEfficiency || ''},${v.assignedUser?.name || ''}`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=vehicles.csv');
    res.send(csv);
  } catch (error) {
    logger.error('Export vehicles error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to export vehicles' });
  }
});

router.get('/export/trips', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    const trips = await prisma.trip.findMany({
      where,
      include: {
        vehicle: { select: { registrationNumber: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    const csv = [
      'id,vehicle,driver,email,destination,startTime,endTime,mileageDriven,purpose,expenses,fuelCost',
      ...trips.map(t => 
        `${t.id},${t.vehicle.registrationNumber},${t.user.name},${t.user.email},${t.destination},${t.startTime},${t.endTime || ''},${t.mileageDriven || ''},${t.purpose},${t.expenses || ''},${t.fuelCost || ''}`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=trips.csv');
    res.send(csv);
  } catch (error) {
    logger.error('Export trips error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to export trips' });
  }
});

router.get('/export/audit-log', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, action } = req.query;

    const where: any = {};
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const csv = [
      'id,userEmail,action,targetType,targetId,details,ipAddress,createdAt',
      ...logs.map(l => 
        `${l.id},${l.userEmail || ''},${l.action},${l.targetType},${l.targetId || ''},${l.details || ''},${l.ipAddress || ''},${l.createdAt}`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    res.send(csv);
  } catch (error) {
    logger.error('Export audit log error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to export audit log' });
  }
});

router.get('/backup', async (req: AuthRequest, res: Response) => {
  try {
    const [users, vehicles, trips, serviceLogs, notifications, auditLogs] = await Promise.all([
      prisma.user.findMany({ select: { passwordHash: false, refreshToken: false } }),
      prisma.vehicle.findMany(),
      prisma.trip.findMany(),
      prisma.serviceLog.findMany(),
      prisma.notification.findMany(),
      prisma.auditLog.findMany({ take: 1000 }),
    ]);

    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: { users, vehicles, trips, serviceLogs, notifications, auditLogs },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=fleet-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.json(backup);
  } catch (error) {
    logger.error('Backup error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to create backup' });
  }
});

export default router;
