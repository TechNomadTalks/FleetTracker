import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware } from '../middleware/auth';
import { validate, uuidParam } from '../middleware/validation';
import logger from '../utils/logger';
import { createAuditLog } from '../services/audit';

const router = Router();

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, a reset link will be sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: resetToken, passwordResetExpires: resetExpires },
    });

    await createAuditLog({
      userId: user.id,
      userEmail: email,
      action: 'PASSWORD_RESET_REQUESTED',
      targetType: 'User',
      targetId: user.id,
      details: { ip: req.ip },
      ipAddress: req.ip || (req as any).socket?.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({ success: true, message: 'If the email exists, a reset link will be sent' });
  } catch (error) {
    logger.error('Forgot password error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password required' });
    }

    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash, 
        passwordResetToken: null, 
        passwordResetExpires: null,
        tokenVersion: { increment: 1 },
      },
    });

    await prisma.userSession.deleteMany({
      where: { userId: user.id },
    });

    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_COMPLETED',
      targetType: 'User',
      targetId: user.id,
      details: { allSessionsInvalidated: true },
      ipAddress: req.ip || (req as any).socket?.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    });

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Verify email error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to verify email' });
  }
});

router.get('/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({ success: true, data: sessions });
  } catch (error) {
    logger.error('Get sessions error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to get sessions' });
  }
});

router.delete('/sessions/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.userSession.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    await prisma.userSession.delete({ where: { id } });

    res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    logger.error('Revoke session error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to revoke session' });
  }
});

router.delete('/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.userSession.deleteMany({
      where: { userId: req.user!.userId },
    });

    res.json({ success: true, message: 'All other sessions revoked' });
  } catch (error) {
    logger.error('Revoke all sessions error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to revoke sessions' });
  }
});

router.put('/license', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { licenseNumber, licenseExpiry } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { 
        ...(licenseNumber && { licenseNumber }),
        ...(licenseExpiry && { licenseExpiry: new Date(licenseExpiry) }),
      },
      select: { id: true, name: true, email: true, licenseNumber: true, licenseExpiry: true },
    });

    await createAuditLog({
      userId: req.user!.userId,
      userEmail: req.user!.email,
      action: 'USER_UPDATE',
      targetType: 'User',
      targetId: user.id,
      details: { licenseNumber, licenseExpiry },
      ipAddress: req.ip || (req as any).socket?.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Update license error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update license' });
  }
});

router.put('/rating', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { rating } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { rating: true, totalTrips: true },
    });

    const newTotalTrips = (user?.totalTrips || 0) + 1;
    const newRating = ((user?.rating || 5) * (user?.totalTrips || 0) + rating) / newTotalTrips;

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { rating: newRating, totalTrips: newTotalTrips },
      select: { id: true, rating: true, totalTrips: true },
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    logger.error('Update rating error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update rating' });
  }
});

export default router;
