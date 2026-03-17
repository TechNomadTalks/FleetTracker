import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.use(authMiddleware);

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

router.post('/subscribe', async (req: AuthRequest, res: Response) => {
  try {
    const subscription: PushSubscription = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, error: 'Invalid subscription' });
    }

    const existing = await prisma.pushSubscription.findFirst({
      where: {
        userId: req.user!.userId,
        endpoint: subscription.endpoint,
      },
    });

    if (!existing) {
      await prisma.pushSubscription.create({
        data: {
          userId: req.user!.userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });
    }

    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    logger.error('Push subscribe error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to subscribe' });
  }
});

router.delete('/unsubscribe', async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body;

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: req.user!.userId,
        endpoint,
      },
    });

    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    logger.error('Push unsubscribe error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to unsubscribe' });
  }
});

router.get('/subscriptions', async (req: AuthRequest, res: Response) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: req.user!.userId },
    });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    logger.error('Get subscriptions error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get subscriptions' });
  }
});

export default router;

export const sendPushNotification = async (userId: string, title: string, body: string) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    for (const sub of subscriptions) {
      console.log('Would send push to:', sub.endpoint, { title, body });
    }
  } catch (error) {
    logger.error('Send push notification error', { error: error instanceof Error ? error.message : String(error) });
  }
};
