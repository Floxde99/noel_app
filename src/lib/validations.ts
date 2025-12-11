import { z } from 'zod'

// Auth schemas
export const loginSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  eventCode: z.string()
    .min(4, 'Le code doit contenir au moins 4 caractères')
    .max(30, 'Le code ne peut pas dépasser 30 caractères')
    .toUpperCase(),
})

// Event schemas
export const createEventSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  date: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  mapUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED']).default('OPEN'),
})

export const updateEventSchema = createEventSchema.partial()

// Event Code schemas
export const createEventCodeSchema = z.object({
  code: z.string().min(4).max(30).toUpperCase(),
  eventIds: z.array(z.string().cuid()).min(1, 'Sélectionnez au moins un événement'),
  isMaster: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
})

// Contribution schemas
export const createContributionSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['plat', 'boisson', 'décor', 'autre']).optional(),
  quantity: z.number().int().min(1).max(100).default(1),
  imageUrl: z.union([z.string().url(), z.string().regex(/^\/uploads\/.+/)]).optional(),
  eventId: z.string().cuid(),
  assigneeId: z.string().cuid().optional(),
})

export const updateContributionSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(['plat', 'boisson', 'décor', 'autre']).optional(),
  quantity: z.number().int().min(1).max(100).optional(),
  status: z.enum(['PLANNED', 'CONFIRMED', 'BROUGHT']).optional(),
  assigneeId: z.string().cuid().optional().nullable(),
})

// Poll schemas
export const createPollSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  type: z.enum(['SINGLE', 'MULTIPLE']).default('SINGLE'),
  imageUrl: z.union([z.string().url(), z.string().regex(/^\/uploads\/.+/)]).optional(),
  eventId: z.string().cuid(),
  autoClose: z.string().datetime().optional(),
  options: z.array(z.string().min(1).max(100)).min(2, 'Au moins 2 options sont requises').max(10),
})

export const voteSchema = z.object({
  pollId: z.string().cuid(),
  optionIds: z.array(z.string().cuid()).min(1),
})

// Task schemas
export const createTaskSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().optional().default(false),
  eventId: z.string().cuid(),
  assigneeId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assigneeId: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
})

// Chat schemas
export const createMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  eventId: z.string().cuid(),
  imageUrls: z.array(z.union([z.string().url(), z.string().regex(/^\/uploads\/.+/)])).optional().default([]),
})

// Profile schemas
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  avatar: z.string().max(10).optional(), // emoji avatar
})

// User schemas (admin)
export const createUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional().nullable(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  avatar: z.string().max(10).optional(),
})

// Type exports
export type LoginInput = z.infer<typeof loginSchema>
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type CreateEventCodeInput = z.infer<typeof createEventCodeSchema>
export type CreateContributionInput = z.infer<typeof createContributionSchema>
export type UpdateContributionInput = z.infer<typeof updateContributionSchema>
export type CreatePollInput = z.infer<typeof createPollSchema>
export type VoteInput = z.infer<typeof voteSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type CreateMessageInput = z.infer<typeof createMessageSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
