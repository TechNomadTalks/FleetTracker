import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleettracker.com' },
    update: {},
    create: {
      email: 'admin@fleettracker.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: 'admin',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@fleettracker.com' },
    update: {},
    create: {
      email: 'user@fleettracker.com',
      passwordHash: userPassword,
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
  console.log('Admin credentials: admin@fleettracker.com / admin123');
  console.log('User credentials: user@fleettracker.com / user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
