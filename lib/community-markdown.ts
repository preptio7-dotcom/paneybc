function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function inline(value: string): string {
  // Tokenize source text once; never apply Markdown replacements to generated HTML.
  const tokens = /(`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g
  let html = '', offset = 0
  for (const match of value.matchAll(tokens)) {
    html += escapeHtml(value.slice(offset, match.index))
    const token = match[0]
    if (token.startsWith('`')) html += `<code>${escapeHtml(token.slice(1, -1))}</code>`
    else if (token.startsWith('[')) {
      const parts = /^\[([^\]]+)\]\((.+)\)$/.exec(token)!
      try {
        const url = new URL(parts[2])
        html += ['http:', 'https:'].includes(url.protocol)
          ? `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer nofollow ugc">${escapeHtml(parts[1])}</a>` : escapeHtml(token)
      } catch { html += escapeHtml(token) }
    } else if (token.startsWith('**')) html += `<strong>${escapeHtml(token.slice(2, -2))}</strong>`
    else html += `<em>${escapeHtml(token.slice(1, -1))}</em>`
    offset = match.index! + token.length
  }
  return html + escapeHtml(value.slice(offset))
}

export function renderCommunityMarkdown(value: string) {
  const lines = value.replace(/\r\n?/g, '\n').trim().split('\n')
  const blocks: string[] = []
  let paragraph: string[] = [], list: string[] = [], code: string[] | null = null
  let listType = 'ul'
  const flushParagraph = () => { if (paragraph.length) blocks.push(`<p>${paragraph.map(inline).join('<br />')}</p>`); paragraph = [] }
  const flushList = () => { if (list.length) blocks.push(`<${listType}>${list.map(v => `<li>${inline(v)}</li>`).join('')}</${listType}>`); list = [] }
  for (const line of lines) {
    if (line.startsWith('```')) {
      flushParagraph(); flushList()
      if (code) { blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); code = null } else code = []
    } else if (code) code.push(line)
    else if (!line.trim()) { flushParagraph(); flushList() }
    else if (/^#{1,3} /.test(line)) {
      flushParagraph(); flushList()
      const level = line.indexOf(' ') + 1
      blocks.push(`<h${level}>${inline(line.slice(level))}</h${level}>`)
    } else if (/^(?:[-*]|\d+\.) /.test(line)) {
      flushParagraph()
      const nextType = /^\d/.test(line) ? 'ol' : 'ul'
      if (nextType !== listType) flushList()
      listType = nextType; list.push(line.replace(/^(?:[-*]|\d+\.) /, ''))
    } else if (line.startsWith('> ')) { flushParagraph(); flushList(); blocks.push(`<blockquote>${inline(line.slice(2))}</blockquote>`) }
    else { flushList(); paragraph.push(line) }
  }
  flushParagraph(); flushList()
  if (code) blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
  return blocks.join('\n')
}
