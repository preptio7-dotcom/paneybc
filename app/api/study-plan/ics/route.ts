export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name') || 'Daily Study Plan'
  const date = searchParams.get('date')
  const time = searchParams.get('time') || '19:00'
  const minutes = Math.max(parseInt(searchParams.get('minutes') || '60', 10), 15)

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 })
  }

  const start = new Date(`${date}T${time}:00`)
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: 'Invalid date/time' }, { status: 400 })
  }

  const end = new Date(start.getTime() + minutes * 60 * 1000)

  const format = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Preptio//Study Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:study-plan-${format(start)}`,
    `DTSTAMP:${format(new Date())}`,
    `DTSTART:${format(start)}`,
    `DTEND:${format(end)}`,
    `SUMMARY:${name}`,
    'RRULE:FREQ=DAILY',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar',
      'Content-Disposition': 'attachment; filename="study-plan.ics"',
    },
  })
}

