import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const loginAttempts = new Map<string, { attempts: number; lastAttempt: number; blockedUntil?: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 30 * 60 * 1000;

export const checkBruteForce = (req: Request, res: Response, next: () => void) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  const record = loginAttempts.get(ip);
  
  if (record) {
    if (record.blockedUntil && now < record.blockedUntil) {
      const remaining = Math.ceil((record.blockedUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        error: `Too many failed attempts. Try again in ${remaining} seconds`,
        retryAfter: remaining,
      });
    }
    
    if (record.lastAttempt && now - record.lastAttempt > WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
  
  next();
};

export const recordFailedAttempt = (req: Request) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  let record = loginAttempts.get(ip);
  
  if (!record) {
    record = { attempts: 0, lastAttempt: now };
  }
  
  record.attempts += 1;
  record.lastAttempt = now;
  
  if (record.attempts >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION;
  }
  
  loginAttempts.set(ip, record);
};

export const clearFailedAttempts = (req: Request) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  loginAttempts.delete(ip);
};

export const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  message: { success: false, error: 'Too many requests from this IP' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  message: { success: false, error: 'Too many authentication attempts' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  message: { success: false, error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
