import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../types';

const CSRF_TOKEN_LENGTH = 32;

export const generateCsrfToken = (): string => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
};

export const csrfMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] as string;
  const sessionToken = req.headers['x-session-token'] as string;

  if (!csrfToken || !sessionToken) {
    return res.status(403).json({ 
      success: false, 
      error: 'CSRF token required' 
    });
  }

  next();
};

export const createSessionToken = (userId: string): string => {
  return crypto.createHash('sha256').update(userId + process.env.JWT_SECRET).digest('hex');
};
