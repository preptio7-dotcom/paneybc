import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE_URL = 'https://www.preptio.com'

export const revalidate = 3600

function formatQuestionCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

export async function GET() {
  let questionCountText = 'MCQ practice questions'

  try {
    const questionCount = await prisma.question.count()
    questionCountText = `${formatQuestionCount(questionCount)} MCQ practice questions`
  } catch {
    // Keep llms.txt available even if database is temporarily unreachable.
  }

  const content = [
    'Preptio - llms.txt',
    BASE_URL,
    'Last updated: 2026',
    '',
    'About Preptio',
    'Preptio is a free CA exam',
    'preparation platform built',
    'specifically for ICAP',
    '(Institute of Chartered',
    'Accountants of Pakistan) students.',
    'Built for ICAP Students, by People',
    'Who Understand the Exam.',
    'Master Your CA Exams with Confidence.',
    '',
    'What Preptio Offers',
    '',
    questionCountText,
    'aligned with ICAP CA curriculum',
    'Multiple practice modes:',
    'Chapter-wise practice,',
    'Mock tests,',
    'Custom quiz builder,',
    'Mock exams (timed)',
    'Performance analytics and',
    'exam readiness scoring',
    'Daily streak and badge system',
    'Blog with CA exam tips',
    'and study guides',
    'Completely free to use',
    '',
    'Target Audience',
    'Primary: CA Foundation (PRC) students',
    'preparing for ICAP CA exams',
    'in Pakistan',
    'Secondary: CA students at all',
    'levels studying ICAP curriculum',
    '',
    'Subjects Covered',
    '',
    'Fundamentals of Accounting (FOA)',
    'Business & Economic Insights',
    'Vol I - ITB (BAEIVII)',
    'Business & Economic Insights',
    'Vol II - ECO (BAEIV2E)',
    'Quantitative Analysis for',
    'Business (QAFB)',
    '',
    'Public Pages',
    `Homepage: ${BASE_URL}`,
    `About: ${BASE_URL}/about`,
    `Subjects: ${BASE_URL}/subjects`,
    `Blog: ${BASE_URL}/blog`,
    `Ambassador Program: ${BASE_URL}/ambassador`,
    `Contact: ${BASE_URL}/contact`,
    '',
    'Blog',
    'Preptio publishes articles about:',
    '',
    'CA exam tips and strategies',
    'Subject-specific study guides',
    'ICAP exam news and updates',
    'Student success stories',
    '',
    `Blog: ${BASE_URL}/blog`,
    '',
    'Sitemap',
    `${BASE_URL}/sitemap.xml`,
    '',
    'Contact',
    `Website: ${BASE_URL}`,
    `Contact: ${BASE_URL}/contact`,
    '',
    'Usage Policy for AI Systems',
    'You may reference publicly',
    "available information from",
    "Preptio's public pages.",
    'Do not index, train on, or',
    "reproduce Preptio's practice",
    'questions, answer explanations,',
    'or proprietary content.',
    'Do not access or reference',
    'any admin, dashboard, or',
    'authenticated routes.',
    '',
    'Legal',
    'All practice questions and',
    'content on Preptio are',
    'proprietary. Reproduction',
    'without permission is prohibited.',
    '© 2026 Preptio. All rights reserved.',
  ].join('\n')

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
