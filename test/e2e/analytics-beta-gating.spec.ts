import { expect, test, type Page } from '@playwright/test'

type MockUser = {
  id: string
  email: string
  name: string
  role: 'student' | 'admin'
  studentRole: 'user' | 'ambassador' | 'unpaid' | null
}

const analyticsFixture = {
  analytics: {
    topStats: {
      totalQuestionsPracticed: 120,
      totalQuestionsTrend: 12,
      overallAccuracy: 72,
      overallAccuracyTrend: 2.1,
      streak: { current: 5, best: 8 },
      examReadiness: { score: 74, trend: 3 },
    },
    readiness: {
      score: 74,
      factors: [
        { key: 'accuracy', label: 'Overall Accuracy', points: 22, maxPoints: 30 },
        { key: 'volume', label: 'Questions Volume', points: 14, maxPoints: 20 },
      ],
      interpretation: {
        tone: 'green',
        title: 'Getting There',
        message: 'Good preparation. Keep practicing your weak areas.',
      },
    },
    accuracyTrend: {
      points: [
        { label: 'Mar 1', userAccuracy: 70, platformAccuracy: 64 },
        { label: 'Mar 2', userAccuracy: 72, platformAccuracy: 65 },
      ],
      insight: { message: 'Your accuracy improved by 2%.', tone: 'green' },
    },
    subjects: [
      {
        code: 'FOA',
        name: 'Fundamentals of Accounting',
        totalQuestions: 1000,
        attempted: 120,
        accuracy: 72,
        trend: 'up',
        averageTimePerQuestion: 44,
        platformAverageAccuracy: 66,
        lastPracticed: new Date().toISOString(),
        progressPercent: 12,
      },
    ],
    heatmap: {
      tabs: [
        {
          code: 'FOA',
          chapters: [
            {
              key: 'C1',
              label: 'Chapter 1',
              attempted: 20,
              accuracy: 68,
              status: 'improving',
              practiceLink: '/subjects/FOA/practice?chapter=C1',
            },
          ],
        },
      ],
    },
    timeAnalysis: {
      averageTimePerQuestion: 44,
      platformAverageTimePerQuestion: 50,
      distribution: [
        { bucket: '<15s', count: 2 },
        { bucket: '15-30s', count: 15 },
        { bucket: '30-60s', count: 40 },
      ],
      insight: 'Good pace.',
    },
    comparison: {
      metrics: [
        { key: 'overall_accuracy', label: 'Overall Accuracy', you: '72%', platform: '64%', trend: 'above' },
      ],
      percentileTop: 28,
    },
  },
}

const recommendationsFixture = {
  recommendations: [
    {
      priority: 'high',
      type: 'weak_chapter',
      title: 'Focus on Chapter 1',
      description: 'Your Chapter 1 accuracy is below target.',
      action: 'Practice Now ->',
      actionLink: '/subjects/FOA/practice?chapter=C1',
      dataPoint: '48% accuracy',
    },
  ],
}

async function mockAnalyticsBetaApis(page: Page, user: MockUser, allowAnalytics: boolean) {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })

    if (pathname === '/api/auth/me') {
      return json({ user })
    }

    if (pathname === '/api/public/settings') {
      return json({
        welcomeMessageTemplate: 'Welcome back, {{name}}!',
        testSettings: {
          betaFeatures: {
            performanceAnalytics: 'beta_ambassador',
            aiRecommendations: 'beta_ambassador',
            blog: 'public',
            faq: 'public',
            studentFeedback: 'public',
          },
        },
      })
    }

    if (pathname === '/api/analytics/deep') {
      if (!allowAnalytics) {
        return json({ error: 'Performance analytics is currently in beta testing.' }, 403)
      }
      return json({ success: true, ...analyticsFixture })
    }

    if (pathname === '/api/analytics/recommendations') {
      if (!allowAnalytics) {
        return json({ error: 'Study recommendations are currently in beta testing.' }, 403)
      }
      return json({ success: true, ...recommendationsFixture })
    }

    return json({ success: true })
  })
}

test.describe('Analytics Beta Gating', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'token',
        value: 'playwright-beta-gating-token',
        url: 'http://127.0.0.1:3100',
      },
    ])
  })

  test('regular user is blocked from analytics beta', async ({ page }) => {
    await mockAnalyticsBetaApis(page, {
      id: 'user-regular',
      email: 'regular@preptio.test',
      name: 'Regular User',
      role: 'student',
      studentRole: 'user',
    }, false)

    await page.goto('/dashboard/analytics')

    await expect(page.getByText('Beta Access Required')).toBeVisible()
    await expect(page.getByText('Performance analytics is currently in beta testing.')).toBeVisible()
  })

  test('ambassador can access analytics beta', async ({ page }) => {
    await mockAnalyticsBetaApis(page, {
      id: 'user-ambassador',
      email: 'ambassador@preptio.test',
      name: 'Ambassador User',
      role: 'student',
      studentRole: 'ambassador',
    }, true)

    await page.goto('/dashboard/analytics')

    await expect(page.getByRole('heading', { name: 'Exam Readiness Score' })).toBeVisible()
    await expect(page.getByText('Beta Access Required')).not.toBeVisible()
  })

  test('admin can access analytics beta', async ({ page }) => {
    await mockAnalyticsBetaApis(page, {
      id: 'user-admin',
      email: 'admin@preptio.test',
      name: 'Admin User',
      role: 'admin',
      studentRole: null,
    }, true)

    await page.goto('/dashboard/analytics')

    await expect(page.getByRole('heading', { name: 'Exam Readiness Score' })).toBeVisible()
    await expect(page.getByText('Beta Access Required')).not.toBeVisible()
  })
})

