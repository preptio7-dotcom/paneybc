import { revalidatePath } from 'next/cache'

export function revalidateBlogPaths(options?: { slug?: string | null; previousSlug?: string | null }) {
  const slug = options?.slug || null
  const previousSlug = options?.previousSlug || null

  revalidatePath('/blog')
  revalidatePath('/sitemap.xml')
  revalidatePath('/')

  if (slug) {
    revalidatePath(`/blog/${slug}`)
  }

  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/blog/${previousSlug}`)
  }
}
