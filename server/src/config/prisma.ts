import { PrismaClient } from '@prisma/client';

const maxConnections = parseInt(process.env.DB_POOL_SIZE || '10');
const connectionTimeout = parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  __test: {},
});

prisma.$connect()
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
  });

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;

export const pool = {
  max: maxConnections,
  connectionTimeout,
};
