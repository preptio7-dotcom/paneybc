export type QuestionOptionItem = {
  text: string
  originalIndex: number
  imageUrl: string
}

export function buildQuestionOptionItems(
  options: string[] | undefined,
  optionImageUrls?: string[] | null
): QuestionOptionItem[] {
  if (!Array.isArray(options)) return []

  return options
    .map((option, index) => ({
      text: String(option || '').trim(),
      originalIndex: index,
      imageUrl: String(optionImageUrls?.[index] || '').trim(),
    }))
    .filter((option) => option.text.length > 0 || option.imageUrl.length > 0)
}

export function optionLetter(index: number) {
  return String.fromCharCode(65 + index)
}
