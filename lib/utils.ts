import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildInlinePdfUrl(input: string) {
  if (!input) return input
  try {
    const url = new URL(input)
    if (!url.hostname.includes('res.cloudinary.com')) {
      return input
    }
    const parts = url.pathname.split('/').filter(Boolean)
    const uploadIndex = parts.findIndex((part) => part === 'upload')
    if (uploadIndex === -1) return input
    const next = parts[uploadIndex + 1]
    if (next && next.startsWith('fl_')) {
      const flags = next.split(',')
      if (!flags.includes('fl_inline')) {
        flags.push('fl_inline')
        parts[uploadIndex + 1] = flags.join(',')
      }
    } else {
      parts.splice(uploadIndex + 1, 0, 'fl_inline')
    }
    url.pathname = `/${parts.join('/')}`
    return url.toString()
  } catch {
    return input
  }
}
