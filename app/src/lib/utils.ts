import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Merge Tailwind classes with conditional logic (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Human "N Minutes Ago" label (ported from the original home.js). */
export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  const wk = Math.floor(diff / 604800000)
  const mo = Math.floor(diff / 2592000000)
  if (min < 1) return "Just now"
  if (min < 60) return `${min} ${min === 1 ? "Minute" : "Minutes"} Ago`
  if (hr < 24) return `${hr} ${hr === 1 ? "Hour" : "Hours"} Ago`
  if (day < 7) return `${day} ${day === 1 ? "Day" : "Days"} Ago`
  if (wk < 4) return `${wk} ${wk === 1 ? "Week" : "Weeks"} Ago`
  return `${mo} ${mo === 1 ? "Month" : "Months"} Ago`
}
