export type ChapterLabelMap = Record<string, string>

type ChapterRow = {
  code: string
  label: string
}

function normalizeChapterCode(value: unknown) {
  return String(value || '').trim()
}

function pickChapterLabel(code: string, row: Record<string, unknown>) {
  const directLabel = String(
    row.name || row.title || row.label || row.chapterName || ''
  ).trim()
  if (directLabel) return directLabel
  return code
}

export function extractChapterRows(chapters: unknown): ChapterRow[] {
  if (!Array.isArray(chapters)) return []

  const rows: ChapterRow[] = []
  for (const chapter of chapters) {
    if (!chapter) continue
    if (typeof chapter === 'string') {
      const code = normalizeChapterCode(chapter)
      if (!code) continue
      rows.push({ code, label: code })
      continue
    }

    if (typeof chapter === 'object') {
      const record = chapter as Record<string, unknown>
      const code = normalizeChapterCode(record.code || record.chapter)
      if (!code) continue
      rows.push({ code, label: pickChapterLabel(code, record) })
    }
  }

  const deduped = new Map<string, ChapterRow>()
  for (const row of rows) {
    const normalizedCode = normalizeChapterCode(row.code)
    if (!normalizedCode || deduped.has(normalizedCode)) continue
    deduped.set(normalizedCode, {
      code: normalizedCode,
      label: row.label || normalizedCode,
    })
  }

  return Array.from(deduped.values())
}

export function buildChapterLabelMap(chapters: unknown): ChapterLabelMap {
  const map: ChapterLabelMap = {}
  for (const row of extractChapterRows(chapters)) {
    map[row.code] = row.label
    map[row.code.toUpperCase()] = row.label
  }
  return map
}

export function mergeChapterLabelMaps(...maps: Array<ChapterLabelMap | undefined | null>) {
  const merged: ChapterLabelMap = {}
  for (const map of maps) {
    if (!map) continue
    for (const [key, value] of Object.entries(map)) {
      if (!key || !value) continue
      if (!merged[key]) merged[key] = value
    }
  }
  return merged
}

export function resolveChapterLabel(
  chapterCode: string | null | undefined,
  chapterLabels: ChapterLabelMap | Map<string, string> | null | undefined
) {
  const normalized = normalizeChapterCode(chapterCode)
  if (!normalized) return 'Unmapped'
  if (!chapterLabels) return normalized

  if (chapterLabels instanceof Map) {
    return (
      chapterLabels.get(normalized) ||
      chapterLabels.get(normalized.toUpperCase()) ||
      normalized
    )
  }

  return chapterLabels[normalized] || chapterLabels[normalized.toUpperCase()] || normalized
}
