'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Label } from './ui/label'
import { ReportQuestionButton } from '@/components/report-question-button'

interface Option {
  id: string
  letter: string
  text: string
}

interface QuestionCardProps {
  questionNumber: number
  questionText: string
  questionId?: string
  subject?: string
  imageUrl?: string
  options: Option[]
  selectedAnswer?: string
  selectedAnswers?: string[]
  allowMultiple?: boolean
  maxSelections?: number
  onAnswerSelect: (answerId: string) => void
  onMultiSelect?: (answerIds: string[]) => void
}

export function QuestionCard({
  questionNumber,
  questionText,
  questionId,
  subject,
  imageUrl,
  options,
  selectedAnswer,
  selectedAnswers,
  allowMultiple = false,
  maxSelections = 2,
  onAnswerSelect,
  onMultiSelect
}: QuestionCardProps) {
  const handleMultiToggle = (id: string) => {
    if (!onMultiSelect) return
    const current = selectedAnswers || []
    if (current.includes(id)) {
      onMultiSelect(current.filter((item) => item !== id))
      return
    }
    if (current.length < maxSelections) {
      onMultiSelect([...current, id])
    }
  }

  return (
    <Card className="border border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-heading text-xl">
            Question {questionNumber}
          </CardTitle>
          {questionId && (
            <ReportQuestionButton
              questionId={questionId}
              subject={subject}
              questionNumber={questionNumber}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question Text */}
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          {questionText}
        </p>
        {imageUrl ? (
          <div className="w-full">
            <img
              src={imageUrl}
              alt="Question diagram"
              className="w-full max-h-80 object-contain rounded-lg border border-border bg-white"
              loading="lazy"
            />
          </div>
        ) : null}

        {/* Options */}
        {!allowMultiple ? (
          <RadioGroup value={selectedAnswer || ''} onValueChange={onAnswerSelect}>
            <div className="space-y-3">
              {options.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedAnswer === option.id
                      ? 'border-primary-green bg-primary-green/5'
                      : 'border-border bg-background-light hover:border-primary-green'
                  }`}
                >
                  <RadioGroupItem
                    value={option.id}
                    id={option.id}
                    className="border-2 border-text-light text-primary-green"
                  />
                  <Label
                    htmlFor={option.id}
                    className="flex-1 cursor-pointer text-base text-text-dark font-medium"
                  >
                    <span className="font-bold mr-3 text-primary-green">
                      {option.letter})
                    </span>
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        ) : (
          <div className="space-y-3">
            {options.map((option) => {
              const isSelected = (selectedAnswers || []).includes(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleMultiToggle(option.id)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 w-full text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-primary-green bg-primary-green/5'
                      : 'border-border bg-background-light hover:border-primary-green'
                  }`}
                >
                  <span className={`h-4 w-4 rounded border-2 flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'border-primary-green text-primary-green' : 'border-text-light text-transparent'
                  }`}>
                    ✓
                  </span>
                  <span className="flex-1 cursor-pointer text-base text-text-dark font-medium">
                    <span className="font-bold mr-3 text-primary-green">
                      {option.letter})
                    </span>
                    {option.text}
                  </span>
                </button>
              )
            })}
            <p className="text-xs text-text-light">Select up to {maxSelections} options.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
