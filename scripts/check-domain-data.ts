
import { prisma } from "../lib/prisma"

const VIDEO_ID = "cmk9wyz0k0001jv04pzw1xd4w"; // ID from screenshot

async function checkVideoDomains() {
    console.log(`Checking video: ${VIDEO_ID}`);
    const video = await prisma.video.findUnique({
        where: { id: VIDEO_ID },
        include: {
            allowedDomains: {
                include: { domain: true }
            }
        }
    })

    if (!video) {
        console.log("Video not found!");
        return;
    }

    console.log("Video Title:", video.title);
    console.log("Visibility:", video.visibility);
    console.log("Allowed Domains:", JSON.stringify(video.allowedDomains.map(d => d.domain.domain), null, 2));
}

checkVideoDomains()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
