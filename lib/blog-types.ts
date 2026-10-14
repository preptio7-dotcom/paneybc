export type BlogCategoryDto = {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  postCount?: number
}

export type BlogAuthorDto = {
  id: string
  name: string
  avatarUrl: string | null
  designation: string | null
}

export type BlogPostDto = {
  id: string
  title: string
  slug: string
  excerpt: string
  coverImageUrl: string | null
  tags: string[]
  relatedSubjects: string[]
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  readingTime: number
  viewsCount: number
  publishedAt: string | null
  scheduledAt?: string | null
  createdAt: string
  updatedAt: string
  authorType: 'admin' | 'guest' | 'student'
  author: BlogAuthorDto
  category: BlogCategoryDto
}
