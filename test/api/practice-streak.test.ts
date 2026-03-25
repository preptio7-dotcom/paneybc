// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveStreakTransition } from '@/lib/practice-streak'
import { getDateKeyInTimezone } from '@/lib/streak-settings'

describe('resolveStreakTransition', () => {
  it('TEST 1 — Same Day: only credits once per day', () => {
    const result = resolveStreakTransition({
      current: 4,
      best: 6,
      lastPracticeKey: '2026-03-01',
      nextPracticeKey: '2026-03-01',
    })

    expect(result.actionType).toBe('no_change')
    expect(result.credited).toBe(false)
    expect(result.streakAfter).toBe(4)
    expect(result.bestAfter).toBe(6)
  })

  it('TEST 2 — Yesterday: increments streak and updates best', () => {
    const result = resolveStreakTransition({
      current: 6,
      best: 6,
      lastPracticeKey: '2026-03-01',
      nextPracticeKey: '2026-03-02',
    })

    expect(result.actionType).toBe('increment')
    expect(result.credited).toBe(true)
    expect(result.streakAfter).toBe(7)
    expect(result.bestAfter).toBe(7)
  })

  it('TEST 3 — Two Day Gap: resets current streak to 1 and keeps best', () => {
    const result = resolveStreakTransition({
      current: 8,
      best: 11,
      lastPracticeKey: '2026-02-27',
      nextPracticeKey: '2026-03-02',
    })

    expect(result.actionType).toBe('reset')
    expect(result.credited).toBe(false)
    expect(result.streakAfter).toBe(1)
    expect(result.bestAfter).toBe(11)
  })

  it('TEST 4 — First Time Ever: initializes streak fields', () => {
    const result = resolveStreakTransition({
      current: 0,
      best: 0,
      lastPracticeKey: null,
      nextPracticeKey: '2026-03-02',
    })

    expect(result.actionType).toBe('first_time')
    expect(result.credited).toBe(true)
    expect(result.streakAfter).toBe(1)
    expect(result.bestAfter).toBe(1)
  })

  it('TEST 5 — UTC Midnight Boundary: 23:59 then 00:01 counts as separate days', () => {
    const keyA = getDateKeyInTimezone(new Date('2026-03-01T23:59:00.000Z'), 'UTC')
    const keyB = getDateKeyInTimezone(new Date('2026-03-02T00:01:00.000Z'), 'UTC')

    const result = resolveStreakTransition({
      current: 1,
      best: 1,
      lastPracticeKey: keyA,
      nextPracticeKey: keyB,
    })

    expect(keyA).toBe('2026-03-01')
    expect(keyB).toBe('2026-03-02')
    expect(result.actionType).toBe('increment')
    expect(result.streakAfter).toBe(2)
  })

  it('TEST 6 — Streak Already Broken: best streak should not decrease', () => {
    const result = resolveStreakTransition({
      current: 10,
      best: 10,
      lastPracticeKey: '2026-02-25',
      nextPracticeKey: '2026-02-28',
    })

    expect(result.actionType).toBe('reset')
    expect(result.streakAfter).toBe(1)
    expect(result.bestAfter).toBe(10)
  })

  it('TEST 7 — Best Streak Update: best increases when current surpasses it', () => {
    const result = resolveStreakTransition({
      current: 9,
      best: 9,
      lastPracticeKey: '2026-03-01',
      nextPracticeKey: '2026-03-02',
    })

    expect(result.actionType).toBe('increment')
    expect(result.streakAfter).toBe(10)
    expect(result.bestAfter).toBe(10)
  })
})
