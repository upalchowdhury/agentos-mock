import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num)
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`
  }
  const minutes = seconds / 60
  return `${minutes.toFixed(2)}m`
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}
