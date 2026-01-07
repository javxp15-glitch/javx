
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Checking Database Connection...');
    try {
        const userCount = await prisma.user.count();
        console.log(`✅ Connected successfully! Current user count: ${userCount}`);

        // Check if we can create a test user (optional, maybe just read is enough for now)
        // await prisma.user.create({ data: { email: 'test@example.com', password: 'hash' } });

    } catch (e) {
        console.error('❌ Connection failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
