import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { validate, profileValidation, passwordValidation } from '../middleware/validation';
import logger from '../utils/logger';

const router = Router();

const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Too many password change attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authMiddleware);

router.get('/', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, emailNotifications: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Get users error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
});

router.put('/profile', validate(profileValidation), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    const userId = req.user!.userId;

    const existingUser = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
      select: { id: true, email: true, name: true, role: true, emailNotifications: true },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Profile update error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

router.put('/password', passwordLimiter, validate(passwordValidation), async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Password change error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

router.put('/notifications', async (req: AuthRequest, res: Response) => {
  try {
    const { emailNotifications } = req.body;
    const userId = req.user!.userId;

    if (typeof emailNotifications !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Invalid notification setting' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailNotifications },
      select: { id: true, email: true, name: true, role: true, emailNotifications: true },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Notification settings error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update notification settings' });
  }
});

export default router;
