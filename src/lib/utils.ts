import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type ZodError } from "zod"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  })
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} à ${formatTime(date)}`
}

export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInMs = d.getTime() - now.getTime()
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return "Aujourd'hui"
  if (diffInDays === 1) return "Demain"
  if (diffInDays === -1) return "Hier"
  if (diffInDays > 0 && diffInDays <= 7) return `Dans ${diffInDays} jours`
  if (diffInDays < 0 && diffInDays >= -7) return `Il y a ${Math.abs(diffInDays)} jours`
  
  return formatDate(d, { weekday: undefined })
}

export function getZodMessage(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(' | ')
}

export function generateEventCode(prefix: string = 'NOEL'): string {
  const year = new Date().getFullYear()
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${year}-${randomPart}`
}
