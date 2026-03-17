import { Router, Request, Response, NextFunction } from 'express';

const API_VERSION = 'v1';

export const versionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('API-Version', API_VERSION);
  res.setHeader('Accept-Version', `application/vnd.fleettracker.v1`);
  next();
};

export const deprecatedMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers['accept-version'] !== API_VERSION) {
    res.setHeader('Deprecation', `true`);
    res.setHeader('Sunset', 'Sat, 01 Jan 2025 00:00:00 GMT');
  }
  next();
};

export const createVersionedRouter = (version: string = 'v1') => {
  const router = Router();
  router.use((req: Request, res: Response, next: NextFunction) => {
    req.headers['x-api-version'] = version;
    next();
  });
  return router;
};
