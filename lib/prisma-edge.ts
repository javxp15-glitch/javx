// Prisma Edge Client - Lightweight client for Edge Runtime
// ใช้กับ Edge Functions เท่านั้น (ไม่มี Query Engine ติดมา)
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

// สร้าง Client แบบที่ไม่มี Engine ติดมา (เบาหวิว)
const prismaEdge = new PrismaClient().$extends(withAccelerate());

export { prismaEdge };
