import { z } from "zod"

// Video Validation Schemas
export const createVideoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1).max(200).optional(), // Will auto-generate if not provided
  description: z.string().max(5000).optional(),
  categoryIds: z.array(z.string()).optional(),
  pornstarIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "DOMAIN_RESTRICTED"]).default("PUBLIC"),
  allowedDomainIds: z.array(z.string()).optional(),
})

export const updateVideoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  categoryIds: z.array(z.string()).optional(),
  pornstarIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "DOMAIN_RESTRICTED"]).optional(),
  status: z.enum(["PROCESSING", "READY", "FAILED"]).optional(),
  allowedDomainIds: z.array(z.string()).optional(),
})

export const videoQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  per_page: z.coerce.number().optional(), // Alias for limit
  search: z.string().optional(),
  categoryId: z.string().optional(),
  pornstarId: z.string().optional(),
  tagId: z.string().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "DOMAIN_RESTRICTED"]).optional(),
  sort: z.enum(["newest", "oldest", "popular"]).default("newest"),
  since: z.string().optional(),
})

// Pornstar Validation Schemas
export const createPornstarSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  nameJp: z.string().max(200).optional(),
  slug: z.string().min(1).max(200).optional(), // Will auto-generate if not provided
  avatar: z.string().url().optional().nullable(),
  height: z.coerce.number().min(100).max(250).optional().nullable(),
  cupSize: z.string().max(10).optional().nullable(),
  bust: z.coerce.number().min(50).max(200).optional().nullable(),
  waist: z.coerce.number().min(40).max(150).optional().nullable(),
  hip: z.coerce.number().min(50).max(200).optional().nullable(),
  birthday: z.coerce.date().optional().nullable(),
  debutYear: z.coerce.number().min(1970).max(2100).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
})

export const updatePornstarSchema = createPornstarSchema.partial()

export const pornstarQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(24),
  search: z.string().optional(),
  minHeight: z.coerce.number().optional(),
  maxHeight: z.coerce.number().optional(),
  cupSize: z.string().optional(),
  minAge: z.coerce.number().optional(),
  maxAge: z.coerce.number().optional(),
  minDebutYear: z.coerce.number().optional(),
  maxDebutYear: z.coerce.number().optional(),
  sort: z.enum(["name", "videos", "newest", "debut"]).default("videos"),
})

// Tag Validation Schemas
export const createTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().min(1).max(100).optional(), // Will auto-generate if not provided
})

export const updateTagSchema = createTagSchema.partial()

export const tagQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().optional(),
  sort: z.enum(["name", "usage", "newest"]).default("usage"),
})

// Auth Validation Schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
})

// Domain Validation Schemas
export const createDomainSchema = z.object({
  domain: z
    .string()
    .url("Invalid domain URL")
    .or(z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)),
})

// Type exports
export type CreateVideoInput = z.infer<typeof createVideoSchema>
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>
export type VideoQueryInput = z.infer<typeof videoQuerySchema>
export type CreatePornstarInput = z.infer<typeof createPornstarSchema>
export type UpdatePornstarInput = z.infer<typeof updatePornstarSchema>
export type PornstarQueryInput = z.infer<typeof pornstarQuerySchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
export type TagQueryInput = z.infer<typeof tagQuerySchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateDomainInput = z.infer<typeof createDomainSchema>
