'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock3, Eye } from 'lucide-react'
import type { BlogPostDto } from '@/lib/blog-types'
import { getProxyMediaUrl } from '@/lib/media-url'

function formatDate(value: string | null) {
  if (!value) return 'Draft'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Draft'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getBadgeStyles(color: string) {
  const safeColor = color || '#16a34a'
  return {
    backgroundColor: `${safeColor}1A`,
    color: safeColor,
    borderColor: `${safeColor}33`,
  }
}

export function BlogCard({
  post,
  priority = false,
  compact = false,
}: {
  post: BlogPostDto
  priority?: boolean
  compact?: boolean
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-250 hover:-translate-y-1.5 hover:border-[#86efac] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_20px_48px_rgba(0,0,0,0.1)]"
    >
      <div className={`relative w-full overflow-hidden ${compact ? 'h-44' : 'h-52'}`}>
        {post.coverImageUrl ? (
          <Image
            src={getProxyMediaUrl(post.coverImageUrl)}
            alt={post.title}
            fill
            className="bg-slate-100 object-contain object-center transition-transform duration-300 group-hover:scale-[1.03]"
            loading={priority ? 'eager' : 'lazy'}
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#dcfce7,#f0fdf4)]">
            <span className="text-6xl font-black text-primary-green/20">P</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <span
          className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          style={getBadgeStyles(post.category.color)}
        >
          {post.category.name}
        </span>

        <h3 className="mt-3 mb-2 line-clamp-2 min-h-[47.6px] text-[17px] font-bold leading-[1.4] text-[#0f172a]">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-[13px] leading-[1.6] text-[#64748b]">{post.excerpt}</p>

        {post.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={`${post.id}-${tag}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="my-3 border-t border-slate-100" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-6 w-6 overflow-hidden rounded-full border border-[#dcfce7] bg-[#f0fdf4]">
              {post.author.avatarUrl ? (
                <Image
                  src={getProxyMediaUrl(post.author.avatarUrl)}
                  alt={post.author.name}
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-primary-green">
                  {post.author.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <span className="truncate text-[12px] text-slate-500">{post.author.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={12} />
              {post.readingTime} min
            </span>
            <span>{formatDate(post.publishedAt)}</span>
            <span className="inline-flex items-center gap-1">
              <Eye size={12} />
              {post.viewsCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
