import { BlogPostVisibility } from '@prisma/client'
import type { BetaFeatureVisibility } from '@/lib/beta-features'
import { canAccessBetaFeature } from '@/lib/beta-features'

export type BlogViewer = {
  role?: string | null
  studentRole?: string | null
}

export function isPrivilegedBlogViewer(viewer?: BlogViewer | null) {
  return viewer?.role === 'admin' || viewer?.role === 'super_admin'
}

export function canViewBetaBlogPosts(viewer?: BlogViewer | null) {
  if (!viewer) return false
  if (isPrivilegedBlogViewer(viewer)) return true
  return viewer.studentRole === 'ambassador'
}

export function canViewBlogFeature(
  visibility: BetaFeatureVisibility,
  viewer?: BlogViewer | null
) {
  if (isPrivilegedBlogViewer(viewer)) return true
  return canAccessBetaFeature(visibility, viewer?.studentRole)
}

export function buildBlogPostVisibilityFilter(viewer?: BlogViewer | null) {
  if (canViewBetaBlogPosts(viewer)) return {}
  return { visibility: BlogPostVisibility.public as const }
}

