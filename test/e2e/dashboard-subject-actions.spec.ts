import { expect, test, type Page } from '@playwright/test'

const subjectFixtures = [
  { code: 'BAEIVI', name: 'Business & Economic Insights Vol I - ITB' },
  { code: 'BAEIV2E', name: 'Business & Economic Insights Vol II - ECO' },
  { code: 'FOA', name: 'Fundamentals of Accounting' },
  { code: 'QAFB', name: 'Quantitative Analysis for Business' },
]

async function mockDashboardApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })

    if (path === '/api/auth/me') {
      return json({
        user: {
          id: 'test-user-1',
          email: 'qa@preptio.test',
          name: 'QA Student',
          role: 'student',
          studentRole: 'user',
        },
      })
    }

    if (path === '/api/public/settings') {
      return json({
        adsEnabled: false,
        testSettings: {
          streakResetTimezone: 'UTC',
        },
      })
    }

    if (path === '/api/admin/subjects') {
      return json({ subjects: subjectFixtures })
    }

    if (path === '/api/dashboard/stats') {
      const now = new Date().toISOString()
      return json({
        stats: subjectFixtures.map((subject, index) => ({
          code: subject.code,
          difficultyCounts: {
            total: 120 + index * 10,
            easy: 40,
            medium: 45,
            hard: 35,
          },
          completedQuestions: 12 + index,
          progressPercent: 10 + index * 5,
          testCount: 2,
          lastPracticedAt: now,
        })),
        globalStats: {
          totalCompleted: 52,
          averageAccuracy: 72,
          dueReviews: 0,
          modeCompletions: {
            baeMock: 0,
            weekIntensive: 0,
            wrongAnswers: 0,
            financialStatements: 0,
          },
        },
      })
    }

    if (path === '/api/review/due') {
      return json({ count: 0 })
    }

    if (path === '/api/user/profile') {
      return json({
        user: {
          id: 'test-user-1',
          name: 'QA Student',
          institute: 'QA Academy',
          createdAt: new Date().toISOString(),
          practiceStreakCurrent: 1,
          practiceStreakBest: 2,
          practiceStreakLastDate: new Date().toISOString(),
          prepChecklist: [],
        },
      })
    }

    if (path === '/api/user/badges') {
      return json({ badges: [] })
    }

    if (path === '/api/user/feedback') {
      return json({ hasSubmitted: false })
    }

    if (path === '/api/financial-statements/summary') {
      return json({
        totalCases: 0,
        totalQuestions: 0,
        totalAttempts: 0,
        completedCases: 0,
        averageScore: 0,
        bestScore: 0,
      })
    }

    if (path === '/api/bae-mock/weak-area') {
      return json({
        success: true,
        attemptCount: 0,
        unlocked: false,
        remainingForUnlock: 3,
        accuracy: { vol1: 0, vol2: 0 },
        comparison: {
          difference: 0,
          weakerVolume: null,
          strongerVolume: null,
          balanced: true,
        },
        history: [],
      })
    }

    if (path === '/api/results') {
      if (method === 'GET') {
        return json({ results: [] })
      }
      return json({ success: true })
    }

    if (path === '/api/analytics') {
      return json({ success: true })
    }

    return json({ success: true })
  })
}

test.describe('Dashboard Subject Actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboardApis(page)
    await page.context().addCookies([
      {
        name: 'token',
        value: 'playwright-test-token',
        url: 'http://127.0.0.1:3100',
      },
    ])
  })

  test('desktop shows Quick Start without hover and preserves mock button contrast on hover', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    await page.goto('/dashboard')

    const continueLearning = page.locator('#continue-learning')
    await expect(continueLearning).toBeVisible()

    const quickStartLink = continueLearning.locator('.dashboard-quick-start').first()
    await expect(quickStartLink).toBeVisible()
    const opacity = await quickStartLink.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity || '0'))
    expect(opacity).toBeGreaterThan(0.99)

    const mockButton = continueLearning.getByRole('button', { name: 'Mock Test' }).first()
    await expect(mockButton).toBeVisible()
    await mockButton.hover()

    const colors = await mockButton.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      }
    })

    expect(colors.color).not.toBe('rgb(255, 255, 255)')
    expect(colors.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('mobile keeps subject action buttons side-by-side in each card', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')

    const subjectCard = page.locator('#continue-learning .dashboard-subject-card').first()
    await expect(subjectCard).toBeVisible()

    const chapterWiseButton = subjectCard.getByRole('button', { name: 'Chapter Wise' })
    const mockButton = subjectCard.getByRole('button', { name: 'Mock Test' })

    await expect(chapterWiseButton).toBeVisible()
    await expect(mockButton).toBeVisible()

    const chapterBox = await chapterWiseButton.boundingBox()
    const mockBox = await mockButton.boundingBox()

    expect(chapterBox).not.toBeNull()
    expect(mockBox).not.toBeNull()
    expect(Math.abs((chapterBox?.y || 0) - (mockBox?.y || 0))).toBeLessThan(8)
  })
})
