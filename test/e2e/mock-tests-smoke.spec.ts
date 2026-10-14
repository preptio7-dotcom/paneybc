import { expect, test, type Page } from '@playwright/test'

type MockFlowFixture = {
  mockKey: 'bae-mock' | 'foa-mock'
  testType: 'bae_mock' | 'foa_mock'
  testName: string
  isCombined: boolean
  subjects: Array<{
    code: string
    name: string
    accentColor: string
    lightBg: string
    lightBorder: string
  }>
}

const baseUser = {
  id: 'playwright-student',
  email: 'qa@preptio.test',
  name: 'Playwright Student',
  role: 'student',
  studentRole: 'user',
}

async function mockCommonApis(page: Page) {
  await page.context().addCookies([
    {
      name: 'token',
      value: 'playwright-mock-tests-token',
      url: 'http://127.0.0.1:3100',
    },
  ])
}

async function mockStartSubmitFlowApis(page: Page, fixture: MockFlowFixture) {
  const sessionId = `${fixture.mockKey}-session-1`
  let submitted = false
  const calls = {
    start: 0,
    submit: 0,
  }

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const method = request.method()
    const { pathname } = new URL(request.url())

    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })

    if (pathname === '/api/auth/me') {
      return json({ user: baseUser })
    }

    if (pathname === '/api/public/settings') {
      return json({
        adsEnabled: false,
        testSettings: {
          betaFeatures: {
            performanceAnalytics: 'public',
            aiRecommendations: 'public',
            blog: 'public',
            faq: 'public',
            studentFeedback: 'public',
          },
        },
      })
    }

    if (pathname === `/api/mock-tests/${fixture.mockKey}/config`) {
      return json({
        success: true,
        canStart: true,
        comingSoon: false,
        availability: {
          total: 120,
          bySubject: fixture.subjects.map((subject) => ({
            code: subject.code,
            count: 60,
          })),
        },
        defaults: {
          totalQuestions: 10,
          timeAllowedMinutes: fixture.isCombined ? 15 : 24,
        },
        errorMessage: null,
      })
    }

    if (pathname === `/api/mock-tests/${fixture.mockKey}/start` && method === 'POST') {
      calls.start += 1
      return json({
        success: true,
        sessionId,
        totalQuestions: 1,
        timeAllowedMinutes: fixture.isCombined ? 2 : 3,
      })
    }

    if (pathname === `/api/mock-tests/session/${sessionId}` && method === 'GET') {
      return json({
        success: true,
        definition: {
          routeKey: fixture.mockKey,
          testType: fixture.testType,
          testName: fixture.testName,
          isCombined: fixture.isCombined,
          subjects: fixture.subjects,
          gradientFrom: fixture.subjects[0].accentColor,
          gradientTo: fixture.subjects[fixture.subjects.length - 1].accentColor,
        },
        session: {
          id: sessionId,
          testType: fixture.testType,
          completed: submitted,
          status: submitted ? 'completed' : 'in_progress',
          totalQuestions: 1,
          timeAllowed: fixture.isCombined ? 2 : 3,
          timeTaken: submitted ? 45 : null,
          vol1Count: fixture.isCombined ? 0 : 0,
          vol2Count: fixture.isCombined ? 1 : 0,
          vol1Correct: fixture.isCombined ? 0 : 0,
          vol2Correct: fixture.isCombined ? 1 : 0,
          correctAnswers: submitted ? 1 : 0,
          wrongAnswers: submitted ? 0 : 0,
          notAttempted: 0,
          scorePercent: submitted ? 100 : 0,
          chapterBreakdown: submitted
            ? {
                C1: {
                  attempted: 1,
                  correct: 1,
                  accuracy: 100,
                },
              }
            : {},
        },
        questions: [
          {
            index: 0,
            id: 'mock-question-1',
            subject: fixture.subjects[0].code,
            chapter: 'C1',
            questionNumber: 1,
            question: 'Smoke test question?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            explanation: 'Because A is correct.',
            difficulty: 'medium',
            allowMultiple: false,
            maxSelections: 1,
            volume: fixture.isCombined ? 'VOL2' : null,
            volumeLabel: fixture.isCombined ? 'Vol II - ECO' : fixture.subjects[0].code,
            chapterLabel: 'Chapter 1',
          },
        ],
        answers: [[]],
        chapterLabels: {
          C1: 'Chapter 1',
        },
      })
    }

    if (pathname === `/api/mock-tests/session/${sessionId}/submit` && method === 'POST') {
      calls.submit += 1
      submitted = true
      return json({
        success: true,
        alreadyCompleted: false,
        summary: {
          id: sessionId,
          completed: true,
          testType: fixture.testType,
          totalQuestions: 1,
          correctAnswers: 1,
          wrongAnswers: 0,
          notAttempted: 0,
          scorePercent: 100,
          timeAllowed: fixture.isCombined ? 2 : 3,
          timeTaken: 45,
          vol1Count: fixture.isCombined ? 0 : 0,
          vol2Count: fixture.isCombined ? 1 : 0,
          vol1Correct: fixture.isCombined ? 0 : 0,
          vol2Correct: fixture.isCombined ? 1 : 0,
          chapterBreakdown: {
            C1: { attempted: 1, correct: 1, accuracy: 100 },
          },
        },
      })
    }

    if (pathname === `/api/mock-tests/${fixture.mockKey}/weak-area`) {
      if (fixture.isCombined) {
        return json({
          success: true,
          attemptCount: 1,
          unlocked: false,
          remainingForUnlock: 2,
          accuracy: { vol1: 0, vol2: 100 },
          comparison: {
            difference: 100,
            weakerVolume: 'VOL1',
            strongerVolume: 'VOL2',
            balanced: false,
          },
          history: [],
        })
      }

      return json({
        success: true,
        attemptCount: 1,
        unlocked: false,
        remainingForUnlock: 2,
        chapters: [
          {
            chapterCode: 'C1',
            chapterLabel: 'Chapter 1',
            attempted: 1,
            correct: 1,
            accuracy: 100,
          },
        ],
        history: [],
        chapterLabels: {
          C1: 'Chapter 1',
        },
      })
    }

    return json({ success: true })
  })

  return calls
}

test.describe('Mock tests smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApis(page)
  })

  for (const fixture of [
    {
      mockKey: 'bae-mock',
      testType: 'bae_mock',
      testName: 'BAE Mock Test',
      isCombined: true,
      subjects: [
        {
          code: 'BAEIVII',
          name: 'Vol I - ITB',
          accentColor: '#16a34a',
          lightBg: '#f0fdf4',
          lightBorder: '#86efac',
        },
        {
          code: 'BAEIV2E',
          name: 'Vol II - ECO',
          accentColor: '#2563eb',
          lightBg: '#eff6ff',
          lightBorder: '#bfdbfe',
        },
      ],
    },
    {
      mockKey: 'foa-mock',
      testType: 'foa_mock',
      testName: 'FOA Mock Test',
      isCombined: false,
      subjects: [
        {
          code: 'FOA',
          name: 'Fundamentals of Accounting',
          accentColor: '#7c3aed',
          lightBg: '#f5f3ff',
          lightBorder: '#ddd6fe',
        },
      ],
    },
  ] as const satisfies MockFlowFixture[]) {
    test(`${fixture.testName}: start to submit flow`, async ({ page }) => {
      const calls = await mockStartSubmitFlowApis(page, fixture)
      await page.goto(`/practice/${fixture.mockKey}`)

      await page.getByRole('button', { name: `Start ${fixture.testName}` }).click()
      await expect.poll(() => calls.start).toBe(1)
      await page.waitForURL(new RegExp(`/practice/${fixture.mockKey}/test\\?sessionId=`), {
        timeout: 30_000,
      })

      await page.getByRole('button', { name: /Option A/i }).first().click()
      await page.getByRole('button', { name: 'Finish Test' }).click()
      await expect.poll(() => calls.submit).toBe(1)
    })
  }

  test('QAFB coming soon + notify flow', async ({ page }) => {
    let notifyCalls = 0

    await page.route('**/api/**', async (route) => {
      const request = route.request()
      const method = request.method()
      const { pathname } = new URL(request.url())

      const json = (data: unknown, status = 200) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(data),
        })

      if (pathname === '/api/auth/me') {
        return json({ user: baseUser })
      }

      if (pathname === '/api/public/settings') {
        return json({ adsEnabled: false, testSettings: {} })
      }

      if (pathname === '/api/mock-tests/qafb-mock/config') {
        return json({
          success: true,
          canStart: false,
          comingSoon: true,
          availability: {
            total: 0,
            bySubject: [{ code: 'QAFB', count: 0 }],
          },
          defaults: {
            totalQuestions: 50,
            timeAllowedMinutes: 120,
          },
          errorMessage:
            'QAFB questions are being added to Preptio. This mock test unlocks automatically once questions are uploaded.',
        })
      }

      if (pathname === '/api/mock-tests/qafb-mock/notify' && method === 'POST') {
        notifyCalls += 1
        return json({
          success: true,
          message: "We'll notify you when QAFB Mock Test is ready.",
        })
      }

      return json({ success: true })
    })

    await page.goto('/practice/qafb-mock')
    await expect(page.getByText('QAFB questions are being added to Preptio.')).toBeVisible({
      timeout: 20_000,
    })
    await page.getByRole('button', { name: 'Notify Me When Ready' }).click()

    await expect.poll(() => notifyCalls).toBe(1)
  })
})
