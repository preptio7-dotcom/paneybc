const XSS_PATTERN =
  /<\s*script|<\/\s*script|javascript:|on\w+\s*=|<\s*iframe|<\s*svg|<\s*img|data:text\/html|&#x?[0-9a-f]+;/i
const SQLI_PATTERN = /(\bunion\b.*\bselect\b|\bdrop\s+table\b|\bor\s+1=1\b|--|\/\*|\*\/|;\s*shutdown\b)/i

export function sanitizePlainText(value: unknown, maxLength = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function sanitizeEmail(value: unknown) {
  return sanitizePlainText(value, 254).toLowerCase()
}

export function sanitizeMultilineText(value: unknown, maxLength = 2000) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength)
}

export function detectSuspiciousInput(input: Record<string, unknown>) {
  for (const [field, rawValue] of Object.entries(input)) {
    const value = String(rawValue || '')
    if (!value) continue
    if (XSS_PATTERN.test(value)) {
      return { field, type: 'xss' as const }
    }
    if (SQLI_PATTERN.test(value)) {
      return { field, type: 'sqli' as const }
    }
  }
  return null
}
