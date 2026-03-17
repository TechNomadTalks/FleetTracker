import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { AuthRequest } from '../types';
import { authMiddleware } from '../middleware/auth';
import { validate, registerValidation, loginValidation } from '../middleware/validation';
import logger from '../utils/logger';
import { createAuditLog } from '../services/audit';

const router = Router();

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

const logAuthAudit = async (req: Request, action: 'LOGIN' | 'LOGOUT' | 'USER_CREATE', userId?: string, email?: string, success?: boolean) => {
  await createAuditLog({
    userId,
    userEmail: email,
    action,
    targetType: 'Auth',
    details: { success, ip: req.ip, userAgent: req.get('user-agent') },
    ipAddress: req.ip || (req as any).socket?.remoteAddress,
    userAgent: req.get('user-agent'),
  });
};

router.post('/register', validate(registerValidation), async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, adminSecret } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    let userRole = 'user';
    if (role === 'admin' && adminSecret === process.env.ADMIN_SECRET) {
      userRole = 'admin';
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: userRole as any,
      },
    });

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tokenVersion: 0 },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    const csrfToken = generateCsrfToken();

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    await logAuthAudit(req, 'USER_CREATE', user.id, email, true);

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        accessToken,
        refreshToken,
        csrfToken,
      },
    });
  } catch (error) {
    logger.error('Register error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

router.post('/login', validate(loginValidation), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } }) as any;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, error: 'Account is deactivated' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      await logAuthAudit(req, 'LOGIN', undefined, email, false);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion || 0 },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    const csrfToken = generateCsrfToken();

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    await logAuthAudit(req, 'LOGIN', user.id, email, true);

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        accessToken,
        refreshToken: newRefreshToken,
        csrfToken,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ success: false, error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    }) as any;

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, error: 'Account is deactivated' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion || 0 },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (error) {
    logger.error('Refresh error', { error: error instanceof Error ? error.message : String(error) });
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { refreshToken: null },
    });
    await logAuthAudit(req, 'LOGOUT', req.user!.userId, req.user!.email, true);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true, emailNotifications: true },
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

export default router;
