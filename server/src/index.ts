import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
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

dotenv.config();

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
    },
  },
  hsts: process.env.NODE_ENV === 'production',
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api', apiLimiter);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'FleetTracker API is running' });
});

const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
});

const connectedUsers = new Map<string, string>();

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join', (userId: string) => {
    if (typeof userId === 'string' && userId.length > 0) {
      socket.join(`user:${userId}`);
      connectedUsers.set(socket.id, userId);
      io.emit('user:online', { userId, socketId: socket.id });
    }
  });

  socket.on('leave', (userId: string) => {
    if (typeof userId === 'string') {
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
