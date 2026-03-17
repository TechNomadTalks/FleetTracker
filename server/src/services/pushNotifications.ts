/**
 * Web Push Notification Service
 * 
 * Purpose:
 * - Send push notifications to PWA clients
 * - Store push subscriptions in database
 * - Support notification scheduling
 * 
 * Overview:
 * Uses VAPID keys for authentication with push services.
 * Subscriptions are stored per user for targeted notifications.
 * 
 * Architecture:
 * - WebPush library for notification delivery
 * - Database storage for subscriptions
 * - VAPID key authentication
 * 
 * Issues Fixed:
 * 1. No push notifications - now implemented
 * 2. Users couldn't receive notifications when offline - now PWA support
 * 
 * Plan:
 * - Add push notification UI settings
 * - Add notification preferences per type
 * - Add batch notification support
 */

import webpush from 'web-push';
import prisma from '../config/prisma';
import logger from '../utils/logger';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@fleettracker.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const saveSubscription = async (userId: string, subscription: PushSubscription) => {
  try {
    const existing = await prisma.pushSubscription.findFirst({
      where: {
        userId,
        endpoint: subscription.endpoint,
      },
    });

    if (existing) {
      return { success: true, message: 'Subscription already exists' };
    }

    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    logger.info(`Push subscription saved for user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error('Failed to save push subscription', { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'Failed to save subscription' };
  }
};

export const removeSubscription = async (userId: string, endpoint: string) => {
  try {
    await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint,
      },
    });
    return { success: true };
  } catch (error) {
    logger.error('Failed to remove push subscription', { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'Failed to remove subscription' };
  }
};

export const sendPushNotification = async (userId: string, title: string, body: string, icon?: string) => {
  if (!vapidPublicKey) {
    logger.warn('WebPush not configured - skipping notification');
    return { success: false, error: 'Push notifications not configured' };
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return { success: false, error: 'No subscriptions found' };
    }

    const notification = {
      title,
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-96.png',
      vibrate: [100, 50, 100],
      data: {
        url: '/dashboard',
        timestamp: Date.now(),
      },
    };

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        await webpush.sendNotification(pushSubscription as any, JSON.stringify(notification));
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    logger.info(`Push notification sent to ${successful}/${subscriptions.length} subscriptions for user ${userId}`);

    return { success: true, sent: successful, failed: subscriptions.length - successful };
  } catch (error) {
    logger.error('Failed to send push notification', { error: error instanceof Error ? error.message: String(error) });
    return { success: false, error: 'Failed to send notification' };
  }
};

export const broadcastPushNotification = async (title: string, body: string, icon?: string) => {
  if (!vapidPublicKey) {
    logger.warn('WebPush not configured - skipping broadcast');
    return { success: false, error: 'Push notifications not configured' };
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      return { success: false, error: 'No subscriptions found' };
    }

    const notification = {
      title,
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-96.png',
    };

    const uniqueEndpoints = [...new Set(subscriptions.map((s) => s.endpoint))];

    const results = await Promise.allSettled(
      uniqueEndpoints.map(async (endpoint) => {
        const sub = subscriptions.find((s) => s.endpoint === endpoint);
        if (!sub) return;
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        await webpush.sendNotification(pushSubscription as any, JSON.stringify(notification));
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    logger.info(`Broadcast push notification sent to ${successful}/${uniqueEndpoints.length} devices`);

    return { success: true, sent: successful, failed: uniqueEndpoints.length - successful };
  } catch (error) {
    logger.error('Failed to broadcast push notification', { error: error instanceof Error ? error.message: String(error) });
    return { success: false, error: 'Failed to broadcast notification' };
  }
};

export const getVapidPublicKey = () => vapidPublicKey;
