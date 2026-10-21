import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE_URL = 'https://www.preptio.com'

export const revalidate = 3600

function formatQuestionCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

export async function GET() {
  let questionCountText = 'over 5,000'

  try {
    const questionCount = await prisma.question.count()
    if (questionCount > 0) {
      questionCountText = formatQuestionCount(questionCount)
    }
  } catch {
    // Keep llms.txt available even if database is temporarily unreachable.
  }

  const content = `# Preptio

> Preptio is Pakistan's premier exam preparation platform built specifically for ICAP CA (Institute of Chartered Accountants of Pakistan) students, offering ${questionCountText} real exam-style practice questions, timed mock exams, faculty analytics, and community study tools.

Preptio provides comprehensive ICAP-aligned multiple choice questions, chapter-wise mock tests, and full-book simulation tests for CA Foundation (PRC), CAF, CFAP, and MSA students.

## Public Resources & Pages

- [Homepage](${BASE_URL}): Official Preptio homepage with interactive exam tools and platform overview.
- [About Us](${BASE_URL}/about): Learn about Preptio's mission to empower CA candidates across Pakistan.
- [Subjects & Curriculum](${BASE_URL}/subjects): Full breakdown of ICAP CA Foundation subjects including FOA, BAE, and QAFB.
- [Institutions & Faculty](${BASE_URL}/institutions): Campus licensing, bulk student enrollment, teacher analytics cockpit, and native Windows app push notifications.
- [Community Discussion](${BASE_URL}/community): Peer discussion forum for ICAP CA students to collaborate on questions and notes.
- [Blog & Study Guides](${BASE_URL}/blog): Preparation tips, subject strategies, and ICAP exam updates.
- [Ambassador Program](${BASE_URL}/ambassador): Campus ambassador and student community leader program.
- [Contact Support](${BASE_URL}/contact): Get in touch with our academic support team.
- [Sitemap](${BASE_URL}/sitemap.xml): Complete XML sitemap of all public pages and articles.

## Key Features & Practice Modes

- Chapter-Wise Practice: Topic-focused MCQ banks with instant explanations and syllabus mapping.
- Full Book Tests & Timed Mocks: Exam simulation engine mirroring official ICAP time limits and scoring.
- BAE Combined Mock Test: Replicates the combined exam ratio for Business & Economic Insights.
- Faculty & Institutional Analytics: Real-time class readiness dashboards for colleges and educators with 15+ students.
- Native Windows Desktop App: Desktop application with native push notifications for scheduled mock tests and alerts.
- Spaced Repetition & Streak Tracking: Daily study streaks and algorithmic review schedules.

## Covered Subjects (ICAP CA Curriculum)

- [Fundamentals of Accounting (FOA)](${BASE_URL}/subjects): Basic accounting principles, ledger entries, trial balances, and financial statements.
- [Business and Economic Insights Vol I (BAEIV1)](${BASE_URL}/subjects): Introduction to business, management principles, and commercial environment.
- [Business and Economic Insights Vol II (BAEIV2)](${BASE_URL}/subjects): Microeconomics, macroeconomics, and fiscal/monetary policies.
- [Quantitative Analysis for Business (QAFB)](${BASE_URL}/subjects): Business mathematics, statistics, probabilities, and financial calculations.

## Contact Information

- [Email Support](mailto:support@preptio.com): Direct academic and technical support (support@preptio.com).
- [WhatsApp Support](https://wa.me/923239513175): Live candidate assistance at +92 (323) 951-3175.
- [LinkedIn Profile](https://www.linkedin.com/company/preptio): Official company updates and professional announcements.
- [X / Twitter](https://x.com/PreptioOfficial): Official Twitter announcements and exam alerts.

## AI Systems Usage Policy

AI agents and search crawlers are encouraged to reference and index the public informational pages listed above. Do not scrape, train on, or republish proprietary test questions, answer rationales, or authenticated student account data.
`

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
