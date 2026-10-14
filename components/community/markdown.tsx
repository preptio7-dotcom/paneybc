import { renderCommunityMarkdown } from '@/lib/community-markdown'
export function Markdown({ body }: { body: string }) {
  return <div className="community-markdown" dangerouslySetInnerHTML={{ __html: renderCommunityMarkdown(body) }} />
}
