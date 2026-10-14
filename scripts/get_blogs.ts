import { prisma } from '../lib/prisma'
async function main() {
  const blogs = await prisma.blogPost.findMany({
    select: { title: true, slug: true, status: true, publishedAt: true }
  })
  console.log(JSON.stringify(blogs, null, 2))
}
main()
  .catch(console.error)
  .finally(() => require('process').exit())
