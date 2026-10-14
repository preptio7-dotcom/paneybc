export const postTypes = ['question', 'discussion', 'resource', 'exam_advice'] as const
export type PostType = typeof postTypes[number]
export const postLabels: Record<PostType, string> = { question: 'Question', discussion: 'Discussion', resource: 'Resource', exam_advice: 'Exam advice' }
export const isPostType = (value: unknown): value is PostType => typeof value === 'string' && postTypes.includes(value as PostType)
