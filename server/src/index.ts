import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import logger from './utils/logger';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import vehicleRoutes from './routes/vehicles';
import tripRoutes from './routes/trips';
import serviceRoutes from './routes/services';
import notificationRoutes from './routes/notifications';
import reportRoutes from './routes/reports';
import dashboardRoutes from './routes/dashboard';
import analyticsRoutes from './routes/analytics';
import adminRoutes from './routes/admin';
import scheduledServicesRoutes from './routes/scheduledServices';
import advancedReportsRoutes from './routes/advancedReports';
import userManagementRoutes from './routes/userManagement';
import integrationsRoutes from './routes/integrations';
import dashboardCustomRoutes from './routes/dashboardCustom';
import importExportRoutes from './routes/importExport';

dotenv.config();

const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (ALLOWED_ORIGINS.includes(origin.trim())) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

const app = express();
const httpServer = createServer(app);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...ALLOWED_ORIGINS],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
    },
  },
  hsts: process.env.NODE_ENV === 'production',
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Too many password change attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, error: 'Too many admin requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many write requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', writeLimiter, userRoutes);
app.use('/api', apiLimiter);
app.use('/api/vehicles', writeLimiter, vehicleRoutes);
app.use('/api/trips', writeLimiter, tripRoutes);
app.use('/api/services', writeLimiter, serviceRoutes);
app.use('/api/scheduled-services', writeLimiter, scheduledServicesRoutes);
app.use('/api/notifications', writeLimiter, notificationRoutes);
app.use('/api/reports', adminLimiter, reportRoutes);
app.use('/api/advanced-reports', adminLimiter, advancedReportsRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/dashboard-custom', apiLimiter, dashboardCustomRoutes);
app.use('/api/analytics', adminLimiter, analyticsRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/user-management', userManagementRoutes);
app.use('/api/integrations', adminLimiter, integrationsRoutes);
app.use('/api/import-export', adminLimiter, importExportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'FleetTracker API is running' });
});

const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
});

const connectedUsers = new Map<string, string>();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string; role: string };
    socket.data.user = decoded;
    next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}, user: ${socket.data.user?.userId}`);

  socket.on('join', () => {
    const userId = socket.data.user?.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      connectedUsers.set(socket.id, userId);
      io.emit('user:online', { userId, socketId: socket.id });
    }
  });

  socket.on('leave', () => {
    const userId = socket.data.user?.userId;
    if (userId) {
      socket.leave(`user:${userId}`);
      connectedUsers.delete(socket.id);
      io.emit('user:offline', { userId });
    }
  });

  socket.on('heartbeat', () => {
    socket.emit('heartbeat_ack', { timestamp: Date.now() });
  });

  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      connectedUsers.delete(socket.id);
      io.emit('user:offline', { userId });
    }
  });
});

setInterval(() => {
  io.emit('heartbeat', { timestamp: Date.now() });
}, 30000);

export const emitVehicleStatus = (vehicleId: string, status: string, updatedBy: string) => {
  io.emit('vehicle:status', { vehicleId, status, updatedBy });
};

export const emitNotification = (userId: string, notification: any) => {
  if (typeof userId === 'string') {
    io.to(`user:${userId}`).emit('notification', notification);
  }
};

export const emitTripCreated = (trip: any, vehicle: any, user: any) => {
  io.emit('trip:created', { trip, vehicle, user });
};

export const emitServiceReminder = (vehicleId: string, message: string) => {
  io.emit('service:reminder', { vehicleId, message });
};

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export { io };
