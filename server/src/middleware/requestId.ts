import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export interface RequestWithId extends Request {
  id: string;
  startTime?: number;
}

export const requestIdMiddleware = (req: RequestWithId, res: Response, next: NextFunction) => {
  req.id = (req.headers['x-request-id'] as string) || uuidv4();
  req.startTime = Date.now();
  
  res.setHeader('X-Request-ID', req.id);
  
  const originalSend = res.send;
  res.send = function (body?: any) {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms [${req.id}]`, {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
    return originalSend.call(this, body);
  };

  next();
};

export const errorHandler = (err: Error, req: RequestWithId, res: Response, next: NextFunction) => {
  const requestId = req.id || 'unknown';
  
  logger.error(`Error [${requestId}]: ${err.message}`, {
    requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId,
  });
};
