import { faqData, type FaqItem } from '@/data/faq-data'

export type FaqSettings = {
  items: FaqItem[]
  featuredIds: string[]
}

const MAX_FAQ_ITEMS = 50
const MAX_QUESTION_LENGTH = 220
const MAX_ANSWER_LENGTH = 1200
const MAX_FEATURED = 5

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function sanitizeId(value: unknown) {
  const id = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
  return id || null
}

function makeFaqId(question: string, index: number) {
  const questionPart = sanitizeId(question)?.slice(0, 40) || `item-${index + 1}`
  return `faq-${questionPart}-${index + 1}`
}

function sanitizeFaqItems(value: unknown, fallback: FaqItem[]) {
  if (!Array.isArray(value)) return fallback

  const usedIds = new Set<string>()
  const normalized = value
    .map((item, index) => {
      const question = sanitizeText((item as any)?.question, MAX_QUESTION_LENGTH)
      const answer = sanitizeText((item as any)?.answer, MAX_ANSWER_LENGTH)
      if (!question || !answer) return null

      const rawId = sanitizeId((item as any)?.id)
      let id = rawId || makeFaqId(question, index)
      while (usedIds.has(id)) {
        id = `${id}-${index + 1}`
      }
      usedIds.add(id)

      return { id, question, answer }
    })
    .filter((item): item is FaqItem => Boolean(item))

  return normalized.length ? normalized.slice(0, MAX_FAQ_ITEMS) : fallback
}

function sanitizeFeaturedIds(value: unknown, items: FaqItem[]) {
  const validIds = new Set(items.map((item) => item.id))
  const featured = Array.isArray(value)
    ? value
        .map((item) => sanitizeId(item))
        .filter((item): item is string => Boolean(item) && validIds.has(item))
    : []
  const deduped = Array.from(new Set(featured))
  if (deduped.length) return deduped.slice(0, MAX_FEATURED)
  return items.slice(0, MAX_FEATURED).map((item) => item.id)
}

export function extractFaqSettings(testSettings: any): FaqSettings {
  const source = testSettings?.faq
  const items = sanitizeFaqItems(source?.items, faqData)
  return {
    items,
    featuredIds: sanitizeFeaturedIds(source?.featuredIds, items),
  }
}

