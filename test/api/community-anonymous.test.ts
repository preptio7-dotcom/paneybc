// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveAuthor, ANON_AUTHOR } from '@/lib/community-server'

describe('Anonymous posting author resolution and security', () => {
  const author = { id: 'user-123', name: 'John Doe', avatar: 'https://example.com/avatar.jpg' }

  it('reveals real author when isAnonymous is false for everyone', () => {
    // Normal viewer
    const normal = resolveAuthor(author, false, 'student')
    expect(normal.author).toEqual(author)
    expect(normal.realAuthor).toBeNull()

    // Admin viewer
    const admin = resolveAuthor(author, false, 'admin')
    expect(admin.author).toEqual(author)
    expect(admin.realAuthor).toBeNull()
  })

  it('hides author identity for non-admin viewers when isAnonymous is true', () => {
    // Other student viewer
    const student = resolveAuthor(author, true, 'student', 'other-student-456')
    expect(student.author).toEqual(ANON_AUTHOR)
    expect(student.realAuthor).toBeNull()

    // Unauthenticated / guest viewer
    const guest = resolveAuthor(author, true, null)
    expect(guest.author).toEqual(ANON_AUTHOR)
    expect(guest.realAuthor).toBeNull()

    // Author themselves receives their realAuthor for editing/deleting their post
    const self = resolveAuthor(author, true, 'student', author.id)
    expect(self.author).toEqual(ANON_AUTHOR)
    expect(self.realAuthor).toEqual(author)
  })

  it('reveals real author to admins and super_admins when isAnonymous is true', () => {
    // Admin viewer
    const admin = resolveAuthor(author, true, 'admin')
    expect(admin.author).toEqual(ANON_AUTHOR)
    expect(admin.realAuthor).toEqual(author)

    // Super admin viewer
    const superAdmin = resolveAuthor(author, true, 'super_admin')
    expect(superAdmin.author).toEqual(ANON_AUTHOR)
    expect(superAdmin.realAuthor).toEqual(author)
  })
})
