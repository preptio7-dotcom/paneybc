'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { BookOpen, Zap, Layers } from 'lucide-react'
import Link from 'next/link'

interface SubjectCardProps {
  name: string
  code: string
  totalQuestions: number
  easyQuestions: number
  mediumQuestions: number
  hardQuestions: number
  completedQuestions: number
  progressPercent: number
}

export function SubjectCard({
  name,
  code,
  totalQuestions,
  easyQuestions,
  mediumQuestions,
  hardQuestions,
  completedQuestions,
  progressPercent
}: SubjectCardProps) {
  const normalizedCode = code?.toString().trim().toUpperCase()
  const encodedCode = encodeURIComponent(normalizedCode || '')

  return (
    <Card className="border border-border hover:shadow-lg transition-all duration-300 hover:scale-102 group cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-green/10 rounded-lg group-hover:bg-primary-green/20 transition-colors">
              <BookOpen size={20} className="text-primary-green" />
            </div>
            <div>
              <CardTitle className="font-heading text-lg">{name}</CardTitle>
              <CardDescription className="text-xs font-semibold text-text-light">
                ({normalizedCode})
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Question Breakdown */}
        <div className="flex justify-between text-xs text-text-light font-medium">
          <span>Total: {totalQuestions}</span>
          <span>Easy: {easyQuestions}</span>
          <span>Med: {mediumQuestions}</span>
          <span>Hard: {hardQuestions}</span>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-text-dark">Your Progress:</p>
            <p className="text-sm font-bold text-primary-green">{progressPercent}%</p>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <p className="text-xs text-text-light">
            {completedQuestions}/{totalQuestions} completed
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Link href={`/subjects/${encodedCode}/test?mode=full`} className="w-full">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs h-9 bg-transparent w-full"
            >
              <Zap size={14} />
              Full Book
            </Button>
          </Link>
          <Link href={`/subjects/${encodedCode}?mode=chapter`} className="w-full">
            <Button
              size="sm"
              className="gap-2 text-xs h-9 w-full"
            >
              <Layers size={14} />
              Chapter Wise
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
