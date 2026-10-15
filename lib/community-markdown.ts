function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const isImageUrl = (url: string) => {
  const clean = url.split('?')[0].toLowerCase()
  return (
    /\.(png|jpe?g|webp|gif|svg)$/i.test(clean) ||
    url.includes('.r2.dev/') ||
    url.includes('/api/community/images/')
  )
}

function inline(value: string): string {
  // Tokenize source text once; never apply Markdown replacements to generated HTML.
  const tokens = /(`[^`\n]+`|!\[[^\]\n]*\]\((?:https?:\/\/[^\s)]+|\/[^\s)]+)\)|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|(?:https?:\/\/(?:[^\s<>"')]+?\.(?:png|jpe?g|webp|gif|svg)|pub-[a-z0-9]+\.r2\.dev\/[^\s<>"')]+))|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/gi
  let html = '', offset = 0
  for (const match of value.matchAll(tokens)) {
    html += escapeHtml(value.slice(offset, match.index))
    const token = match[0]
    if (token.startsWith('`')) {
      html += `<code>${escapeHtml(token.slice(1, -1))}</code>`
    } else if (token.startsWith('![')) {
      const parts = /^!\[([^\]]*)\]\((.+)\)$/.exec(token)!
      let src = ''
      if (parts[2].startsWith('/') && !parts[2].startsWith('//')) {
        src = escapeHtml(parts[2])
      } else {
        try {
          const url = new URL(parts[2])
          if (['http:', 'https:'].includes(url.protocol)) {
            src = escapeHtml(url.href)
          }
        } catch {}
      }
      if (src) {
        const altText = escapeHtml(parts[1] || 'Community image')
        html += `<span class="my-3 block"><a href="${src}" target="_blank" rel="noopener noreferrer" class="inline-block max-w-full"><img src="${src}" alt="${altText}" loading="lazy" class="max-h-96 max-w-full rounded-xl border border-slate-200/90 shadow-sm object-contain bg-slate-50 hover:opacity-95 transition-opacity" /></a></span>`
      } else {
        html += escapeHtml(token)
      }
    } else if (token.startsWith('[')) {
      const parts = /^\[([^\]]+)\]\((.+)\)$/.exec(token)!
      try {
        const url = new URL(parts[2])
        if (['http:', 'https:'].includes(url.protocol)) {
          const href = url.href
          if (isImageUrl(href)) {
            const altText = escapeHtml(parts[1] || 'Community image')
            html += `<span class="my-3 block"><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="inline-block max-w-full"><img src="${escapeHtml(href)}" alt="${altText}" loading="lazy" class="max-h-96 max-w-full rounded-xl border border-slate-200/90 shadow-sm object-contain bg-slate-50 hover:opacity-95 transition-opacity" /></a></span>`
          } else {
            html += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow ugc">${escapeHtml(parts[1])}</a>`
          }
        } else {
          html += escapeHtml(token)
        }
      } catch { html += escapeHtml(token) }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      try {
        const url = new URL(token)
        if (['http:', 'https:'].includes(url.protocol) && isImageUrl(url.href)) {
          html += `<span class="my-3 block"><a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer" class="inline-block max-w-full"><img src="${escapeHtml(url.href)}" alt="Community image" loading="lazy" class="max-h-96 max-w-full rounded-xl border border-slate-200/90 shadow-sm object-contain bg-slate-50 hover:opacity-95 transition-opacity" /></a></span>`
        } else {
          html += escapeHtml(token)
        }
      } catch { html += escapeHtml(token) }
    } else if (token.startsWith('**')) {
      html += `<strong>${escapeHtml(token.slice(2, -2))}</strong>`
    } else {
      html += `<em>${escapeHtml(token.slice(1, -1))}</em>`
    }
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
