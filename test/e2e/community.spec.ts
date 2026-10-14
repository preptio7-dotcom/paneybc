import { test, expect, type Page } from '@playwright/test'

const category = { id: 'accounting', name: 'Accounting', slug: 'accounting', description: 'Compare approaches, explain your working, and master the fundamentals.' }
const law = { id: 'law', name: 'Business Law', slug: 'business-law', description: 'Make sense of the rules with fellow students.' }
const author = { id: 'student-1', name: 'Ayesha Khan', avatar: '/avatars/girl_1.png' }
const titles = ['Why is depreciation added back in the cash flow statement?', 'A simple way to remember debit and credit rules', 'How do you structure your revision before mock exams?', 'Accruals vs prepayments: checking my working', 'What finally helped you understand trial balances?']
const thread = (id: string, index = 0) => ({ id, title: id === 'older-thread' ? 'An older discussion outside the first page' : titles[index % titles.length], body: 'I understand the calculation, but I want to understand the reasoning.\n\nWhat approach helped you? Please share your working or a useful example.', createdAt: '2026-09-15T12:00:00Z', postType: 'question', solvedAt: null, acceptedCommentId: null, pinnedAt: null, editedAt: null, saved: false, following: false, locked: false, score: 12 - index, viewerVote: 0, commentCount: 52, category, author })
const comment = (id: string, parentCommentId: string | null = null) => ({ id, parentCommentId, body: 'Start with the effect on cash, then separate the non-cash adjustments.\n\n**The reasoning matters more than memorising the rule.**', author, createdAt: '2026-09-15T13:00:00Z', deleted: false, score: 4, viewerVote: 0 })

test('phase 3 search, collections and ranges stay in the URL', async ({ page }) => {
  const state = await fixtures(page, true)
  await page.goto('/community')
  await page.getByLabel('Search discussions', { exact: true }).fill('cash flow')
  await page.getByRole('button', { name: 'Search community', exact: true }).click()
  await page.getByLabel('Question status', { exact: true }).selectOption('unanswered')
  await page.getByRole('button', { name: 'Top', exact: true }).click()
  await page.getByLabel('Top posts time range').selectOption('week')
  expect(new URL(page.url()).searchParams.get('q')).toBe('cash flow')
  await page.getByRole('button', { name: 'Save', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Saved', exact: true }).first()).toHaveAttribute('aria-pressed', 'true')
  expect(state.changes['t1-0'].saved).toBe(true)
  await page.getByRole('button', { name: 'More actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Follow discussion', exact: true }).click()
  await expect.poll(() => state.changes['t1-0'].following).toBe(true)
  await page.getByRole('button', { name: 'Saved posts', exact: true }).click()
  await page.reload()
  await expect(page.getByLabel('Search discussions', { exact: true })).toHaveValue('cash flow')
  await expect(page.getByLabel('Top posts time range')).toHaveValue('week')
  await expect(page.getByRole('button', { name: 'Saved posts', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('phase 3 owners edit, accept answers, and remove their answer without losing replies', async ({ page }) => {
  const state = await fixtures(page, true)
  await page.goto('/community?thread=older-thread')
  await page.getByRole('button', { name: 'More actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Edit discussion', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Title', { exact: true }).fill('Updated question about depreciation')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Updated question about depreciation' })).toBeVisible()
  const answer = page.locator('#comment-c1')
  await answer.getByRole('button', { name: 'Accept answer', exact: true }).first().click()
  await expect(answer.getByText('Accepted answer · selected by the question author', { exact: true })).toBeVisible()
  await answer.getByRole('button', { name: 'More actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Edit comment', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Comment', { exact: true }).fill('An improved explanation of the cash adjustment.')
  await page.getByRole('button', { name: 'Save comment', exact: true }).click()
  await expect(answer.getByText('An improved explanation of the cash adjustment.', { exact: true })).toBeVisible()
  await answer.getByRole('button', { name: 'More actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Delete comment', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete comment', exact: true }).click()
  await expect(answer.getByText('Accepted answer · selected by the question author', { exact: true })).toHaveCount(0)
  await expect(page.locator('#comment-c3')).toBeVisible()
  expect(state.changes['older-thread'].solvedAt).toBeNull()
})

test('phase 3 notifications open an older reply, mark it read, and save preferences', async ({ page }) => {
  const state = await fixtures(page, true)
  await page.goto('/community')
  await page.getByRole('button', { name: /Community notifications/ }).click()
  const inbox = page.getByRole('dialog')
  await inbox.getByText('Notification preferences', { exact: true }).click()
  await inbox.getByLabel('New comments in discussions I follow', { exact: true }).uncheck()
  await expect.poll(() => state.preferences.followed).toBe(false)
  await inbox.getByRole('button').filter({ hasText: 'Ali replied to your comment' }).click()
  await expect(page).toHaveURL(/thread=older-thread&comment=c51$/)
  await expect(page.locator('#comment-c51')).toBeInViewport()
  expect(state.noticeRead).toBe(true)
  await page.getByLabel('Sort comments', { exact: true }).selectOption('top')
  await expect(page.getByLabel('Sort comments', { exact: true })).toHaveValue('top')
})

test('phase 3 moderator can pin a post and guest save prompts login', async ({ page }) => {
  const state = await fixtures(page, true)
  state.role = 'admin'
  await page.goto('/community?thread=older-thread')
  await page.getByRole('button', { name: 'More actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Pin discussion', exact: true }).click()
  await expect(page.getByText('Pinned', { exact: true })).toBeVisible()
  state.signedIn = false
  await page.reload()
  await page.getByRole('button', { name: 'Save', exact: true }).first().click()
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Log in', exact: true })).toBeVisible()
})

async function fixtures(page: Page, signedIn = false) {
  const state = { signedIn, vote: 0, failComment: false, commentBodies: [] as string[], changes: {} as Record<string, Record<string, unknown>>, commentChanges: {} as Record<string, Record<string, unknown>>, role: 'student', noticeRead: false, preferences: { replies: true, followed: true } }
  await page.addInitScript(() => {
    localStorage.setItem('subscription_popup_last_dismiss', new Date().toISOString())
    localStorage.setItem('pwa_prompt_dismissed', 'true')
  })
  await page.route('https://**/*', route => route.abort())
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    let data: unknown = {}
    let status = 200
    if (path === '/api/auth/me') { data = state.signedIn ? { user: { ...author, email: 'student@test.com', role: state.role, popupDismissed: true } } : {}; status = state.signedIn ? 200 : 401 }
    else if (path === '/api/auth/login') { state.signedIn = true; data = { user: { ...author, email: 'student@test.com', role: state.role, popupDismissed: true } } }
    else if (path === '/api/auth/signup/send-code') data = { success: true }
    else if (path === '/api/auth/signup/verify-code') data = { verificationToken: 'browser-test-verification' }
    else if (path === '/api/auth/register') { state.signedIn = true; data = { user: { ...author, email: 'student@test.com', role: state.role, popupDismissed: true } } }
    else if (path === '/api/public/settings') data = { testSettings: {}, registration: {} }
    else if (path === '/api/community/notifications') {
      if (route.request().method() === 'PATCH') state.noticeRead = true
      data = { notifications: state.noticeRead && url.searchParams.get('unread') === 'true' ? [] : [{ id: 'n1', kind: 'reply', readAt: state.noticeRead ? new Date().toISOString() : null, createdAt: '2026-09-19T10:00:00Z', commentId: 'c51', actor: { name: 'Ali' }, thread: { id: 'older-thread', title: 'An older discussion outside the first page' } }], unread: state.noticeRead ? 0 : 1, hasMore: false }
    }
    else if (path === '/api/community/preferences') { if (route.request().method() === 'PUT') state.preferences = route.request().postDataJSON(); data = { preferences: state.preferences } }
    else if (path === '/api/community/categories') data = { categories: [category, law] }
    else if (path === '/api/community/vote') { state.vote = route.request().postDataJSON().value; data = { score: 12 + state.vote, viewerVote: state.vote } }
    else if (path === '/api/community/report') data = { success: true }
    else if (path === '/api/community/threads') {
      if (route.request().method() === 'POST') { data = { thread: { ...thread('created'), ...route.request().postDataJSON() } }; status = 201 }
      else data = { threads: Array.from({ length: 5 }, (_, i) => ({ ...thread(`t${url.searchParams.get('page') || 1}-${i}`, i), ...state.changes[`t${url.searchParams.get('page') || 1}-${i}`], viewerVote: i === 0 ? state.vote : 0 })), hasMore: url.searchParams.get('page') !== '2' }
    } else if (/\/threads\/[^/]+\/(bookmark|follow)$/.test(path)) {
      const id = path.split('/').at(-2)!
      const body = route.request().postDataJSON()
      state.changes[id] = { ...state.changes[id], ...body }; data = body
    } else if (/\/comments\/[^/]+$/.test(path)) {
      const id = path.split('/').pop()!
      const change = route.request().method() === 'DELETE' ? { deleted: true, body: '', author: null, score: 0, viewerVote: 0 } : { body: route.request().postDataJSON().body, editedAt: new Date().toISOString() }
      state.commentChanges[id] = change
      if (state.changes['older-thread']?.acceptedCommentId === id && change.deleted) state.changes['older-thread'] = { ...state.changes['older-thread'], acceptedCommentId: null, solvedAt: null }
      data = { comment: { ...comment(id), ...change } }
    } else if (/\/threads\/[^/]+\/comments$/.test(path)) {
      if (route.request().method() === 'POST') {
        state.commentBodies.push(route.request().postDataJSON().body)
        if (state.failComment) { data = { error: 'Please wait before posting again. Your draft has been kept.' }; status = 429 }
        else data = { comment: { ...comment('posted'), body: route.request().postDataJSON().body, parentCommentId: route.request().postDataJSON().parentCommentId } }
      } else data = { comments: url.searchParams.get('page') === '2' ? [comment('c51', 'c1')] : [{ ...comment('c1'), ...state.commentChanges.c1 }, { ...comment('c2', 'c1'), deleted: true, body: '', author: null }, comment('c3', 'c2'), ...(url.searchParams.get('focus') ? [comment('c51', 'c1')] : [])], hasMore: url.searchParams.get('page') !== '2', total: 52, locked: false }
    } else if (/\/threads\/[^/]+$/.test(path)) {
      const id = path.split('/').pop()!
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON()
        const change = body.action === 'accept' ? { acceptedCommentId: body.commentId, solvedAt: new Date().toISOString() } : body.action === 'solve' ? { solvedAt: body.solved ? new Date().toISOString() : null, acceptedCommentId: null } : body.action === 'pin' ? { pinnedAt: body.pinned ? new Date().toISOString() : null } : { ...body, editedAt: new Date().toISOString(), category }
        state.changes[id] = { ...state.changes[id], ...change }
      }
      data = { thread: { ...thread(id), ...state.changes[id], viewerVote: state.vote } }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  })
  return state
}

test('guest login returns to the exact older discussion and keeps feed context', async ({ page }) => {
  await fixtures(page)
  await page.goto('/community?sort=top&category=accounting&page=2&thread=older-thread')
  await expect(page.getByRole('heading', { name: 'An older discussion outside the first page' })).toBeVisible()
  await page.getByRole('button', { name: 'Upvote', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('link', { name: 'Log in', exact: true }).click()
  await page.getByLabel('Email Address').fill('student@test.com')
  await page.getByLabel('Password', { exact: true }).fill('test-password')
  await page.locator('form').getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/community\?sort=top&category=accounting&page=2&thread=older-thread$/)
  await expect(page.getByRole('heading', { name: 'An older discussion outside the first page' })).toBeVisible()
})

test('login and signup switches keep the return destination', async ({ page }) => {
  await fixtures(page)
  await page.goto('/auth/login?returnTo=%2Fcommunity%3Fthread%3Dolder-thread')
  await page.getByRole('link', { name: 'Sign up here' }).click()
  await expect(page).toHaveURL(/auth\/signup\?returnTo=/)
  await page.getByRole('link', { name: 'Login here' }).click()
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/community?thread=older-thread')
})

test('signup email verification returns to the original discussion', async ({ page }) => {
  await fixtures(page)
  await page.goto('/auth/signup?returnTo=%2Fcommunity%3Fthread%3Dolder-thread')
  await page.locator('#name').fill('Ayesha Khan')
  await page.locator('#email').fill('student@test.com')
  await page.locator('#phone').fill('03001234567')
  await page.locator('#password').fill('test-password')
  await page.locator('#confirmPassword').fill('test-password')
  await page.locator('input[name="acceptTerms"]').check()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.locator('#city').fill('Karachi')
  await page.getByLabel("I'm studying independently (no institute)").check()
  await page.getByRole('button', { name: 'Rate 4 star', exact: true }).click()
  await page.getByRole('button', { name: 'Send Verification Code' }).click()
  await page.locator('#verificationCode').fill('123456')
  await page.getByRole('button', { name: 'Verify & Create Account' }).click()
  await expect(page).toHaveURL(/community\?thread=older-thread$/)
  await expect(page.getByRole('heading', { name: 'An older discussion outside the first page' })).toBeVisible()
})

test('votes hydrate after refresh and can be removed', async ({ page }) => {
  const state = await fixtures(page, true)
  state.vote = 1
  await page.goto('/community')
  const upvote = page.getByRole('button', { name: 'Upvote', exact: true }).first()
  await expect(upvote).toHaveAttribute('aria-pressed', 'true')
  await upvote.click()
  await expect(upvote).toHaveAttribute('aria-pressed', 'false')
  await page.reload()
  await expect(upvote).toHaveAttribute('aria-pressed', 'false')
})

test('failed comment retains draft and removed parent keeps replies visible', async ({ page }) => {
  const state = await fixtures(page, true)
  state.failComment = true
  await page.goto('/community?thread=older-thread')
  const draft = page.getByLabel('Join the conversation', { exact: true })
  await draft.fill('This is my carefully written answer.\nKeep my working.')
  await page.getByRole('button', { name: 'Comment', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Please wait' })).toBeVisible()
  await expect(draft).toHaveValue('This is my carefully written answer.\nKeep my working.')
  await expect(page.locator('#comment-c3')).toBeVisible()
  await page.getByRole('button', { name: 'Load more comments' }).click()
  await expect(page.locator('#comment-c51')).toBeVisible()
  await page.reload()
  await expect(draft).toHaveValue('This is my carefully written answer.\nKeep my working.')
})

test('feed controls survive opening a post and browser back', async ({ page }) => {
  await fixtures(page, true)
  await page.goto('/community')
  await page.getByRole('button', { name: 'Top', exact: true }).click()
  await page.getByLabel('Filter by subject').selectOption('accounting')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/sort=top&category=accounting&page=2$/)
  await page.getByRole('heading', { level: 2 }).filter({ hasText: titles[0] }).getByRole('link').click()
  await page.goBack()
  await expect(page).toHaveURL(/sort=top&category=accounting&page=2$/)
  await expect(page.getByRole('button', { name: 'Top', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Filter by subject')).toHaveValue('accounting')
})

test('desktop and mobile layouts keep creation accessible with no horizontal overflow', async ({ page }) => {
  await fixtures(page, true)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/community')
  await expect(page.getByRole('heading', { name: titles[0] })).toBeVisible()
  await page.screenshot({ path: 'test-results/community-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: 'Create post' })).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/community-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Create post' }).click()
  await page.getByLabel('Subject', { exact: true }).selectOption('accounting')
  await page.getByLabel('Title', { exact: true }).fill('Help me understand cash flow')
  await page.getByLabel('Your post', { exact: true }).fill('First paragraph.\n\n- Show my working\n- Ask for feedback')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByRole('dialog').locator('li').first()).toHaveText('Show my working')
  await page.screenshot({ path: 'test-results/community-composer-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Publish discussion' }).click()
  await expect(page).toHaveURL(/thread=created$/)
})
