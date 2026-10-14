export function communityText(value: unknown, multiline = false) {
  if (typeof value !== 'string') return ''
  return value.replace(/\r\n?/g, '\n')
    .replace(multiline ? /[\u0000-\u0008\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g, ' ').trim()
}

export function pagination(search: URLSearchParams, defaultLimit: number, maxLimit: number) {
  const page = Number(search.get('page') || 1)
  const limit = Number(search.get('limit') || defaultLimit)
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(limit) || limit < 1 || limit > maxLimit) return null
  return { page, limit, skip: (page - 1) * limit }
}
