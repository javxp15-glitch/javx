
import { prisma } from "../lib/prisma"

async function checkVideos() {
    const videos = await prisma.video.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            visibility: true,
            allowedDomains: {
                include: { domain: true }
            }
        }
    })

    console.log("Recent 5 videos status:")
    console.log(JSON.stringify(videos, null, 2))
}

checkVideos()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
