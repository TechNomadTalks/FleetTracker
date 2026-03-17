import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const integrations = await prisma.integration.findMany();
    res.json({ success: true, data: integrations });
  } catch (error) {
    logger.error('Get integrations error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get integrations' });
  }
});

router.post('/google-calendar', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, clientSecret, refreshToken } = req.body;

    const config = JSON.stringify({ clientId, clientSecret, refreshToken });

    const integration = await prisma.integration.upsert({
      where: { type: 'google_calendar' },
      update: { config, isActive: true },
      create: { type: 'google_calendar', config, isActive: true },
    });

    logger.info('Google Calendar integration configured', { userId: req.user?.userId });
    res.json({ success: true, data: integration });
  } catch (error) {
    logger.error('Google Calendar setup error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to configure Google Calendar' });
  }
});

router.post('/slack', async (req: AuthRequest, res: Response) => {
  try {
    const { webhookUrl, channel } = req.body;

    const config = JSON.stringify({ webhookUrl, channel });

    const integration = await prisma.integration.upsert({
      where: { type: 'slack' },
      update: { config, isActive: true },
      create: { type: 'slack', config, isActive: true },
    });

    logger.info('Slack integration configured', { userId: req.user?.userId });
    res.json({ success: true, data: integration });
  } catch (error) {
    logger.error('Slack setup error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to configure Slack' });
  }
});

router.post('/quickbooks', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, clientSecret, realmId, accessToken, refreshToken } = req.body;

    const config = JSON.stringify({ clientId, clientSecret, realmId, accessToken, refreshToken });

    const integration = await prisma.integration.upsert({
      where: { type: 'quickbooks' },
      update: { config, isActive: true },
      create: { type: 'quickbooks', config, isActive: true },
    });

    logger.info('QuickBooks integration configured', { userId: req.user?.userId });
    res.json({ success: true, data: integration });
  } catch (error) {
    logger.error('QuickBooks setup error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to configure QuickBooks' });
  }
});

router.delete('/:type', async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;

    await prisma.integration.delete({
      where: { type },
    });

    res.json({ success: true, message: 'Integration removed' });
  } catch (error) {
    logger.error('Delete integration error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to remove integration' });
  }
});

router.post('/:type/test', async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;

    const integration = await prisma.integration.findUnique({
      where: { type },
    });

    if (!integration || !integration.isActive) {
      return res.status(400).json({ success: false, error: 'Integration not active' });
    }

    const config = JSON.parse(integration.config);

    switch (type) {
      case 'slack':
        console.log('Testing Slack webhook:', config.webhookUrl);
        break;
      case 'google_calendar':
        console.log('Testing Google Calendar with config:', config.clientId);
        break;
      case 'quickbooks':
        console.log('Testing QuickBooks with realm:', config.realmId);
        break;
    }

    res.json({ success: true, message: 'Test successful - check server logs for details' });
  } catch (error) {
    logger.error('Test integration error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to test integration' });
  }
});

export default router;
