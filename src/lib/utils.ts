import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date/string as a localized time string (PH locale).
 * e.g. "02:30 PM"
 */
export function formatTime(dateValue: string | Date): string {
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
  return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format a date/string as a localized date + time string (PH locale).
 * e.g. "Feb 26, 02:30 PM"
 */
export function formatDateTime(dateValue: string | Date): string {
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
  return date.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
