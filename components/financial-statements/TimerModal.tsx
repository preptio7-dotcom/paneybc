'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TimerModalProps {
  defaultTime: number
  onStart: (timeLimit: number) => void
}

export function TimerModal({ defaultTime, onStart }: TimerModalProps) {
  const [minutes, setMinutes] = useState(defaultTime)

  useEffect(() => {
    setMinutes(defaultTime)
  }, [defaultTime])

  return (
    <Dialog open>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Time Limit</DialogTitle>
          <DialogDescription>
            Choose a time limit for this case. You can customize it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[30, 45, 60, 90].map((value) => (
              <Button
                key={value}
                type="button"
                variant={minutes === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMinutes(value)}
              >
                {value} min
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-dark">Custom time (minutes)</label>
            <Input
              type="number"
              min={10}
              max={180}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
          </div>
          <Button onClick={() => onStart(Math.max(10, minutes))} className="w-full">
            Start Practice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
