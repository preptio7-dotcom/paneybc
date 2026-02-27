import { faqData, type FaqItem } from '@/data/faq-data'

export type FaqSettings = {
  items: FaqItem[]
}

const MAX_FAQ_ITEMS = 50
const MAX_QUESTION_LENGTH = 220
const MAX_ANSWER_LENGTH = 1200

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function sanitizeFaqItems(value: unknown, fallback: FaqItem[]) {
  if (!Array.isArray(value)) return fallback

  const normalized = value
    .map((item) => {
      const question = sanitizeText((item as any)?.question, MAX_QUESTION_LENGTH)
      const answer = sanitizeText((item as any)?.answer, MAX_ANSWER_LENGTH)
      if (!question || !answer) return null
      return { question, answer }
    })
    .filter((item): item is FaqItem => Boolean(item))

  return normalized.length ? normalized.slice(0, MAX_FAQ_ITEMS) : fallback
}

export function extractFaqSettings(testSettings: any): FaqSettings {
  const source = testSettings?.faq
  return {
    items: sanitizeFaqItems(source?.items, faqData),
  }
}
