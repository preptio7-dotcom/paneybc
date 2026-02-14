'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Badge } from './ui/badge'
import { useAuth } from '@/lib/auth-context'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'

interface Activity {
  _id: string
  subject: string
  score: number
  correctAnswers: number
  totalQuestions: number
  createdAt: string
}

export function RecentActivity() {
  const { user } = useAuth()
  const [activities, setActivities] = React.useState<Activity[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (user?.id) {
      fetchResults()
    }
  }, [user?.id])

  const fetchResults = async () => {
    if (!user || !user.id) return
    try {
      const response = await fetch(`/api/results?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.results.slice(0, 5)) // Get latest 5
      }
    } catch (error) {
      console.error('Failed to fetch results:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-primary-green" size={32} />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <Card className="border border-border">
        <CardContent className="p-12 text-center text-text-light">
          No recent activity found. Take a test to see your performance!
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="font-heading">Recent Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-text-dark font-semibold">Subject</TableHead>
                <TableHead className="text-text-dark font-semibold">Accuracy</TableHead>
                <TableHead className="text-text-dark font-semibold">Questions</TableHead>
                <TableHead className="text-text-dark font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity, idx) => (
                <TableRow
                  key={activity._id ?? `${activity.subject ?? 'activity'}-${activity.createdAt ?? idx}`}
                  className="border-border hover:bg-background-light/50"
                >
                  <TableCell className="font-medium text-text-dark">
                    {activity.subject}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`${activity.score >= 50 ? 'bg-success-green/10 text-success-green border-success-green/30' : 'bg-rose-100 text-rose-500 border-rose-200'}`}
                    >
                      {activity.score}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-light">
                    {activity.correctAnswers}/{activity.totalQuestions}
                  </TableCell>
                  <TableCell className="text-text-light">
                    {format(new Date(activity.createdAt), 'MMM dd')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
