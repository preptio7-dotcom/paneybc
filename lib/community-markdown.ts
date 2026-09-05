function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeLink(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '#'
  } catch {
    return '#'
  }
}

export function renderCommunityMarkdown(value: string) {
  const escaped = escapeHtml(value.trim())
  return escaped
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) =>
      `<a href="${escapeHtml(safeLink(href))}" target="_blank" rel="noopener noreferrer">${label}</a>`
    )
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(?:<li>.*<\/li>\n?)+/g, (list) => `<ul>${list}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br />')
    .replace(/^(.+)$/s, '<p>$1</p>')
}

const cooldowns = new Map<string, number>()

export function enforceCommunityCooldown(userId: string, scope: string, cooldownMs = 15_000) {
  const key = `${scope}:${userId}`
  const now = Date.now()
  const previous = cooldowns.get(key) || 0
  if (now - previous < cooldownMs) return false
  cooldowns.set(key, now)
  return true
}
