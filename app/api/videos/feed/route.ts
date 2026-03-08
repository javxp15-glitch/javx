export const runtime = "nodejs";

import { prisma } from '@/lib/prisma';
import { verifyAuthEdge } from '@/lib/auth-edge';
import { normalizeR2Url, toPublicPlaybackUrl } from '@/lib/r2-edge';
import { videoQuerySchema } from '@/lib/validation';

const mapPluginVideo = (video: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    videoUrl: string;
    thumbnailUrl: string | null;
    duration: number | null;
    createdAt: Date;
    updatedAt: Date;
    categories?: { category: { name: string } }[];
    pornstars?: { pornstar: { name: string; slug: string } }[];
    tags?: { tag: { name: string; slug: string } }[];
    createdBy: { name: string | null };
    views: number;
}) => ({
    id: video.id,
    title: video.title,
    slug: video.slug,
    description: video.description ?? "",
    video_url: normalizeR2Url(video.videoUrl),
    embed_url: `/embed/${video.id}`,
    playback_url: toPublicPlaybackUrl(video.videoUrl) ?? normalizeR2Url(video.videoUrl),
    thumbnail_url: normalizeR2Url(video.thumbnailUrl),
    duration: video.duration,
    categories: video.categories?.map((c) => c.category.name) || [],
    pornstars: video.pornstars?.map((p) => ({ name: p.pornstar.name, slug: p.pornstar.slug })) || [],
    tags: video.tags?.map((t) => t.tag.name) || [],
    created_at: video.createdAt,
    updated_at: video.updatedAt,
    views: video.views,
    uploader: video.createdBy.name ?? "System",
    rating: "99%",
});

// GET - List videos with filters (Edge Runtime)
export async function GET(req: Request) {
    try {
        // Optional auth - ถ้าไม่ได้ login ก็ดู public videos ได้
        const user = await verifyAuthEdge(req).catch(() => null);

        const { searchParams } = new URL(req.url);
        const query = Object.fromEntries(searchParams.entries());
        const validatedQuery = videoQuerySchema.parse(query);
        const limit = validatedQuery.per_page ?? validatedQuery.limit;

        const parseSinceDate = (value?: string) => {
            if (!value) return null;
            const numeric = Number(value);
            if (Number.isFinite(numeric)) {
                const ms = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
                const date = new Date(ms);
                if (!Number.isNaN(date.getTime())) return date;
            }
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) return date;
            return null;
        };

        const userAgent = req.headers.get("user-agent") ?? "";
        const isPluginRequest =
            searchParams.has("per_page") ||
            searchParams.has("project_id") ||
            searchParams.has("since") ||
            userAgent.includes("7LS-Video-Publisher");

        // Build where clause
        // ⚠️ ปลดล็อคชั่วคราวเพื่อทดสอบ - TODO: ใส่กลับหลังทดสอบเสร็จ
        const where: any = {}; // เดิม: { status: "READY" }

        if (isPluginRequest) {
            const mp4Filter = { OR: [{ mimeType: "video/mp4" }, { videoUrl: { endsWith: ".mp4" } }] };
            where.AND = where.AND ? [...where.AND, mp4Filter] : [mp4Filter];
        }

        // Search by title or description
        if (validatedQuery.search) {
            where.OR = [
                { title: { contains: validatedQuery.search, mode: "insensitive" } },
                { description: { contains: validatedQuery.search, mode: "insensitive" } },
            ];
        }

        // Filter by category
        if (validatedQuery.categoryId) {
            where.categories = { some: { categoryId: validatedQuery.categoryId } };
        } else if (validatedQuery.categorySlug) {
            where.categories = { some: { category: { slug: validatedQuery.categorySlug } } };
        }

        // Filter by pornstar
        if (validatedQuery.pornstarId) {
            where.pornstars = { some: { pornstarId: validatedQuery.pornstarId } };
        } else if (validatedQuery.pornstarSlug) {
            where.pornstars = { some: { pornstar: { slug: validatedQuery.pornstarSlug } } };
        }

        // Filter by tag
        if (validatedQuery.tagId) {
            where.tags = { some: { tagId: validatedQuery.tagId } };
        } else if (validatedQuery.tagSlug) {
            where.tags = { some: { tag: { slug: validatedQuery.tagSlug } } };
        }

        // Filter by visibility
        if (validatedQuery.visibility) {
            where.visibility = validatedQuery.visibility;
        }

        // Filter by allowed domain
        if (validatedQuery.domainId) {
            where.allowedDomains = { some: { domainId: validatedQuery.domainId } };
        }

        // ⚠️ ปลดล็อคชั่วคราว - ไม่เช็ค visibility ก่อน
        // Visibility logic: Admin เห็นทั้งหมด, User เห็น public + ของตัวเอง, Guest เห็นแค่ public
        // if (!user) {
        //     where.visibility = "PUBLIC";
        // } else if (user.role !== "ADMIN") {
        //     where.OR = [{ visibility: "PUBLIC" }, { createdById: user.userId }];
        // }

        if (validatedQuery.since) {
            const sinceDate = parseSinceDate(validatedQuery.since);
            if (sinceDate) where.updatedAt = { gt: sinceDate };
        }

        // Sorting
        const orderBy: any = {};
        if (validatedQuery.sort === "newest") orderBy.createdAt = "desc";
        else if (validatedQuery.sort === "oldest") orderBy.createdAt = "asc";
        else if (validatedQuery.sort === "popular") orderBy.views = "desc";

        // Pagination
        const skip = (validatedQuery.page - 1) * limit;
        const take = limit;

        const [videos, total] = await Promise.all([
            prisma.video.findMany({
                where,
                orderBy,
                skip,
                take,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    description: true,
                    videoUrl: true,
                    thumbnailUrl: true,
                    duration: true,
                    createdAt: true,
                    updatedAt: true,
                    views: true,
                    categories: {
                        select: {
                            category: { select: { name: true } }
                        }
                    },
                    pornstars: {
                        select: {
                            pornstar: { select: { name: true, slug: true } }
                        }
                    },
                    tags: {
                        select: {
                            tag: { select: { name: true, slug: true } }
                        }
                    },
                    createdBy: { select: { id: true, name: true, email: true } },
                },
            }),
            prisma.video.count({ where }),
        ]);

        const normalizedVideos = videos.map((video) => ({
            ...video,
            videoUrl: normalizeR2Url(video.videoUrl) ?? video.videoUrl,
            thumbnailUrl: normalizeR2Url(video.thumbnailUrl),
        }));

        if (isPluginRequest) {
            const totalPages = Math.ceil(total / limit);
            const hasMore = validatedQuery.page * limit < total;

            return Response.json({
                data: normalizedVideos.map((video) => mapPluginVideo(video)),
                pagination: {
                    page: validatedQuery.page,
                    per_page: limit,
                    total,
                    total_pages: totalPages,
                    next_page: hasMore ? validatedQuery.page + 1 : null,
                    has_more: hasMore,
                },
            });
        }

        return Response.json({
            videos: normalizedVideos,
            pagination: {
                page: validatedQuery.page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("List videos error:", error);
        return Response.json({ error: "Failed to fetch videos" }, { status: 500 });
    }
}
