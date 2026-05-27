import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient, Role } from '../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const username = 'admin';
  const password = 'admin123';

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: 'admin@travel.local' }] },
  });
  if (existing) {
    console.log('管理员用户已存在，跳过创建');
    console.log(`  username: ${existing.username}`);
    console.log(`  role: ${existing.role}`);
    await prisma.$disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      nickName: '管理员',
      email: 'admin@travel.local',
      role: 'ADMIN' as Role,
    },
  });

  console.log('管理员用户创建成功:');
  console.log(`  id:       ${user.id}`);
  console.log(`  username: ${user.username}`);
  console.log(`  role:     ${user.role}`);

  await prisma.$disconnect();
  await pool.end();
}

seed().catch((err) => {
  console.error('创建失败:', err);
  process.exit(1);
});
