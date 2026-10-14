// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: m.query } }))
vi.mock('@/lib/auth', () => ({ getCurrentUser: () => ({ userId: 'u1' }) }))
vi.mock('@/lib/community-server', () => ({ threadResults: async (ids: string[]) => ids.map(id => ({ id })), canParticipate: vi.fn(), communityLimit: vi.fn() }))
import { GET } from '@/app/api/community/threads/route'

// Real PostgreSQL engine in memory: never reads DATABASE_URL or contacts Neon.
const db = new PGlite()
beforeAll(async () => {
  await db.exec('CREATE TABLE "User" (id TEXT PRIMARY KEY); INSERT INTO "User" VALUES (\'u1\'), (\'u2\');')
  await db.exec(readFileSync('prisma/migrations/20260317000000_add_community/migration.sql', 'utf8'))
  await db.exec("INSERT INTO community_threads(id,category_id,author_id,title,body) VALUES ('legacy','community-accounting','u1','Original discussion','Keep the existing content');")
  await db.exec(readFileSync('prisma/migrations/20260917000000_community_phase3/migration.sql', 'utf8'))
  await db.exec(`
    INSERT INTO community_threads(id,category_id,author_id,title,body,post_type,solved_at,pinned_at,created_at) VALUES
    ('question','community-accounting','u1','Cash flow question','Working through adjustments','question',null,null,NOW()),
    ('solved','community-accounting','u1','Cash flow solution','A clear explanation','question',NOW(),null,NOW() - interval '2 days'),
    ('pinned','community-accounting','u2','Cash flow study guide','Useful resources','resource',null,NOW(),NOW() - interval '90 days'),
    ('removed','community-accounting','u1','Cash flow hidden','Removed discussion','question',null,null,NOW()),
    ('law','community-business-law','u2','Contract law question','Cash flow business implications','question',null,NOW(),NOW());
    UPDATE community_threads SET deleted = true WHERE id = 'removed';
    INSERT INTO community_votes(id,user_id,target_type,target_id,value,updated_at) VALUES ('v1','u1','thread','question',1,NOW()), ('v2','u2','thread','question',1,NOW()), ('v3','u2','thread','solved',1,NOW());
    INSERT INTO community_bookmarks(user_id,thread_id) VALUES ('u1','question'), ('u2','solved');
    INSERT INTO community_follows(user_id,thread_id) VALUES ('u1','solved');
    INSERT INTO community_comments(id,thread_id,author_id,body) VALUES ('answer','question','u2','Here is the reasoning');
  `)
  m.query.mockImplementation(async (query: { text: string; values: unknown[] }) => (await db.query(query.text, query.values)).rows)
}, 60000)
afterAll(async () => { await db.close() })
const feed = async (query: string) => {
  const response = await GET(new NextRequest(`http://localhost/api/community/threads?${query}`))
  expect(response.status).toBe(200)
  return response.json() as Promise<{ threads: { id: string }[]; hasMore: boolean }>
}

describe('phase 3 migration and real PostgreSQL feed', () => {
  it('migrates populated community tables without losing existing discussions', async () => {
    const row = (await db.query("SELECT title,body,post_type FROM community_threads WHERE id = 'legacy'")).rows[0]
    expect(row).toEqual({ title: 'Original discussion', body: 'Keep the existing content', post_type: 'discussion' })
  })
  it('searches body and title with subject filters and pins only matching posts', async () => {
    const data = await feed('q=cash+flow&category=accounting&sort=top')
    expect(data.threads.map(t => t.id)).toEqual(['pinned', 'question', 'solved'])
  })
  it('uses full-text search rather than interpreting input as SQL', async () => {
    expect((await feed(new URLSearchParams({ q: "zzzz'); DROP TABLE community_threads; --" }).toString())).threads).toEqual([])
    expect((await db.query('SELECT COUNT(*) FROM community_threads')).rows[0]).toEqual({ count: 6 })
  })
  it('filters unresolved and solved questions', async () => {
    expect((await feed('status=unanswered&category=accounting')).threads.map(t => t.id)).toEqual(['question'])
    expect((await feed('status=solved')).threads.map(t => t.id)).toEqual(['solved'])
  })
  it('applies top time windows before ranking and pagination', async () => {
    const data = await feed('sort=top&range=week&category=accounting&limit=1')
    expect(data.threads.map(t => t.id)).toEqual(['question'])
    expect(data.hasMore).toBe(true)
    expect((await feed('sort=top&range=week&category=accounting&limit=1&page=2')).threads.map(t => t.id)).toEqual(['solved'])
  })
  it('keeps saved and followed feeds private to the viewer', async () => {
    expect((await feed('view=saved')).threads.map(t => t.id)).toEqual(['question'])
    expect((await feed('view=following')).threads.map(t => t.id)).toEqual(['solved'])
  })
  it('enforces bookmark and notification deduplication with database constraints', async () => {
    await expect(db.exec("INSERT INTO community_bookmarks(user_id,thread_id) VALUES ('u1','question')")).rejects.toThrow()
    await db.exec("INSERT INTO community_notifications(id,user_id,actor_id,thread_id,comment_id,kind) VALUES ('n1','u1','u2','question','answer','reply');")
    await expect(db.exec("INSERT INTO community_notifications(id,user_id,actor_id,thread_id,comment_id,kind) VALUES ('n2','u1','u2','question','answer','reply')")).rejects.toThrow()
  })
  it('accepts new moderation audit actions after the migration', async () => {
    await db.exec("INSERT INTO community_moderation_actions(id,actor_id,action_type,target_type,target_id) VALUES ('pin-action','u1','pin','thread','question')")
    expect((await db.query("SELECT action_type FROM community_moderation_actions WHERE id='pin-action'")).rows[0]).toEqual({ action_type: 'pin' })
  })
})
