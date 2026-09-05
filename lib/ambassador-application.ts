export type AmbassadorAnswer = {
  question: string
  answer: string
}

const DETAILS_HEADER_REGEX = /^Ambassador Application Details:?$/i

export function parseAmbassadorAnswers(message: string | null | undefined): AmbassadorAnswer[] {
  if (!message) return []

  const normalized = message.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !DETAILS_HEADER_REGEX.test(block))

  return blocks.map((block) => {
    const separatorIndex = block.indexOf(':')
    if (separatorIndex === -1) {
      return {
        question: 'Response',
        answer: block,
      }
    }

    return {
      question: block.slice(0, separatorIndex).trim(),
      answer: block.slice(separatorIndex + 1).trim() || '-',
    }
  })
}
