import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

router.use(authMiddleware);

router.get('/2fa/setup', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const secret = speakeasy.generate({
      name: `FleetTracker (${user.email})`,
      issuer: 'FleetTracker',
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        twoFactorSecret: secret.base32,
      },
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
      },
    });
  } catch (error) {
    logger.error('2FA setup error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to setup 2FA' });
  }
});

router.post('/2fa/enable', async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, error: '2FA not set up' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    logger.error('2FA enable error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to enable 2FA' });
  }
});

router.post('/2fa/disable', async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, error: '2FA not enabled' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token: token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    logger.error('2FA disable error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to disable 2FA' });
  }
});

router.post('/2fa/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, error: '2FA not enabled' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token: token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    res.json({ success: true, message: '2FA verified successfully' });
  } catch (error) {
    logger.error('2FA verify error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to verify 2FA' });
  }
});

export default router;
