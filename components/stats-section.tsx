'use client'

import React, { useState, useEffect } from 'react'

interface Stat {
  number: number
  label: string
  suffix?: string
}

const defaultStats: Stat[] = [
  { number: 2000, label: 'Questions Available', suffix: '+' },
  { number: 15000, label: 'Active Students', suffix: '+' },
  { number: 95, label: 'Pass Rate', suffix: '%' },
  { number: 5, label: 'Subjects Covered' }
]

interface AnimatedCounterProps {
  end: number
  suffix?: string
}

function AnimatedCounter({ end, suffix = '' }: AnimatedCounterProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const duration = 2000
    const steps = 60
    const increment = end / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [end])

  return (
    <span className="font-heading font-bold text-4xl md:text-5xl text-primary-green">
      {count.toLocaleString()}{suffix}
    </span>
  )
}

export function StatsSection() {
  const [stats, setStats] = useState<Stat[]>(defaultStats)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/public/stats')
        if (!response.ok) return
        const data = await response.json()
        const totalQuestions = Number(data.totalQuestions) || 0
        const totalSubjects = Number(data.totalSubjects) || 0
        const roundedQuestions = totalQuestions >= 1000
          ? Math.floor(totalQuestions / 1000) * 1000
          : totalQuestions

        setStats((prev) => prev.map((stat) => {
          if (stat.label === 'Questions Available') {
            return { ...stat, number: roundedQuestions, suffix: '+' }
          }
          if (stat.label === 'Subjects Covered' && totalSubjects > 0) {
            return { ...stat, number: totalSubjects, suffix: stat.suffix }
          }
          return stat
        }))
      } catch (error) {
        // ignore, keep defaults
      }
    }

    loadStats()
  }, [])

  return (
    <section className="w-full bg-background-light py-20">
      <div className="max-w-7xl mx-auto w-full px-6">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-dark mb-4">
            Trusted by Thousands
          </h2>
          <p className="text-text-light text-lg">
            Join a thriving community of successful CA students
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow duration-300 border border-border"
            >
              <AnimatedCounter end={stat.number} suffix={stat.suffix} />
              <p className="text-text-light text-base mt-4 font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
