import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateSecurePassword(length = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

async function main() {
  console.log('Seeding database...');

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || generateSecurePassword();
  const userPassword = process.env.SEED_USER_PASSWORD || generateSecurePassword(12);

  const adminPwdHash = await bcrypt.hash(adminPassword, 12);
  const userPwdHash = await bcrypt.hash(userPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleettracker.com' },
    update: {},
    create: {
      email: 'admin@fleettracker.com',
      passwordHash: adminPwdHash,
      name: 'Admin User',
      role: 'admin',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@fleettracker.com' },
    update: {},
    create: {
      email: 'user@fleettracker.com',
      passwordHash: userPwdHash,
      name: 'Regular User',
      role: 'user',
    },
  });

  const vehicles = [
    {
      registrationNumber: 'ABC-1234',
      make: 'Toyota',
      model: 'Camry',
      currentMileage: 45000,
      serviceInterval: 10000,
      lastServiceMileage: 45000,
      status: 'available' as const,
    },
    {
      registrationNumber: 'XYZ-5678',
      make: 'Honda',
      model: 'Accord',
      currentMileage: 62000,
      serviceInterval: 10000,
      lastServiceMileage: 57000,
      status: 'available' as const,
    },
    {
      registrationNumber: 'DEF-9012',
      make: 'Ford',
      model: 'F-150',
      currentMileage: 98500,
      serviceInterval: 10000,
      lastServiceMileage: 98000,
      status: 'available' as const,
    },
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { registrationNumber: vehicle.registrationNumber },
      update: {},
      create: vehicle,
    });
  }

  console.log('Database seeded successfully!');
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log('Generated admin password:', adminPassword);
  }
  if (!process.env.SEED_USER_PASSWORD) {
    console.log('Generated user password:', userPassword);
  }
  console.log('Admin credentials: admin@fleettracker.com / (check above or set SEED_ADMIN_PASSWORD)');
  console.log('User credentials: user@fleettracker.com / (check above or set SEED_USER_PASSWORD)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
