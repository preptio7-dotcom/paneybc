import { AdminBlogEditorPage } from '@/components/blog/admin-blog-editor-page'

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AdminBlogEditorPage mode="edit" postId={id} />
}
