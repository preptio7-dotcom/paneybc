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
import Link from 'next/link'
import { Button } from './ui/button'
import { useAuth } from '@/lib/auth-context'
import { format } from 'date-fns'
import { BarChart2, Loader2 } from 'lucide-react'

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
      <Card className="border border-slate-200 rounded-2xl bg-white shadow-sm">
        <CardContent className="p-10 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
            <BarChart2 size={28} />
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-800">No activity yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Complete your first practice session to see detailed performance analytics here.
          </p>
          <Link href="/weak-area" className="inline-flex mt-5">
            <Button className="bg-green-600 hover:bg-green-700">Start Your First Practice</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="border border-slate-200 rounded-2xl bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-slate-900">Recent Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="text-slate-700 font-semibold">Subject</TableHead>
                <TableHead className="text-slate-700 font-semibold">Accuracy</TableHead>
                <TableHead className="text-slate-700 font-semibold">Questions</TableHead>
                <TableHead className="text-slate-700 font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity, idx) => (
                <TableRow
                  key={activity._id ?? `${activity.subject ?? 'activity'}-${activity.createdAt ?? idx}`}
                  className="border-slate-100 hover:bg-green-50/40"
                >
                  <TableCell className="font-medium text-slate-900">
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
                  <TableCell className="text-slate-500">
                    {activity.correctAnswers}/{activity.totalQuestions}
                  </TableCell>
                  <TableCell className="text-slate-500">
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
