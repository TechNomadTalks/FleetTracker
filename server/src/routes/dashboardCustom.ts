import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/widgets', async (req: AuthRequest, res: Response) => {
  try {
    const widgets = await prisma.dashboardWidget.findMany({
      orderBy: { position: 'asc' },
    });
    res.json({ success: true, data: widgets });
  } catch (error) {
    logger.error('Get widgets error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get widgets' });
  }
});

router.post('/widgets', async (req: AuthRequest, res: Response) => {
  try {
    const { type, title, position, config, isVisible } = req.body;

    const widget = await prisma.dashboardWidget.create({
      data: { type, title, position: position || 0, config: config ? JSON.stringify(config) : null, isVisible: isVisible ?? true },
    });

    res.status(201).json({ success: true, data: widget });
  } catch (error) {
    logger.error('Create widget error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to create widget' });
  }
});

router.put('/widgets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, position, config, isVisible } = req.body;

    const widget = await prisma.dashboardWidget.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(position !== undefined && { position }),
        ...(config && { config: JSON.stringify(config) }),
        ...(isVisible !== undefined && { isVisible }),
      },
    });

    res.json({ success: true, data: widget });
  } catch (error) {
    logger.error('Update widget error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update widget' });
  }
});

router.delete('/widgets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.dashboardWidget.delete({ where: { id } });
    res.json({ success: true, message: 'Widget deleted' });
  } catch (error) {
    logger.error('Delete widget error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to delete widget' });
  }
});

router.get('/filters', async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query;
    const filters = await prisma.savedFilter.findMany({
      where: type ? { type: type as string } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: filters });
  } catch (error) {
    logger.error('Get filters error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get filters' });
  }
});

router.post('/filters', async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, filterData } = req.body;

    const filter = await prisma.savedFilter.create({
      data: { name, type, filterData: JSON.stringify(filterData) },
    });

    res.status(201).json({ success: true, data: filter });
  } catch (error) {
    logger.error('Save filter error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to save filter' });
  }
});

router.delete('/filters/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.savedFilter.delete({ where: { id } });
    res.json({ success: true, message: 'Filter deleted' });
  } catch (error) {
    logger.error('Delete filter error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to delete filter' });
  }
});

export default router;
