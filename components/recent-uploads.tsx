'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Eye, Trash2, RotateCcw, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import Link from 'next/link'

interface Upload {
  _id: string
  filename: string
  subject: string
  status: 'completed' | 'processing' | 'failed'
  count: number
  createdAt: string
}

function getStatusConfig(status: Upload['status']) {
  switch (status) {
    case 'completed':
      return {
        icon: <CheckCircle size={16} />,
        label: 'Completed',
        badgeClass: 'bg-success-green/10 border-success-green/30 text-success-green'
      }
    case 'processing':
      return {
        icon: <Clock size={16} />,
        label: 'Processing',
        badgeClass: 'bg-secondary-gold/10 border-secondary-gold/30 text-secondary-gold animate-pulse'
      }
    case 'failed':
      return {
        icon: <AlertCircle size={16} />,
        label: 'Failed',
        badgeClass: 'bg-error-red/10 border-error-red/30 text-error-red'
      }
    default:
      return {
        icon: <Clock size={16} />,
        label: 'Unknown',
        badgeClass: 'bg-gray-100 text-gray-500'
      }
  }
}

export function RecentUploads() {
  const { toast } = useToast()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchUploads()
  }, [])

  const fetchUploads = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/uploads')
      const data = await response.json()
      if (response.ok) {
        setUploads(data.uploads || [])
      }
    } catch (error) {
      console.error('Failed to fetch uploads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this upload? All associated questions will also be removed.')) {
      return
    }

    try {
      setIsDeleting(id)
      const response = await fetch(`/api/admin/uploads?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Deleted",
          description: "Upload and questions removed successfully.",
        })
        setUploads(uploads.filter(u => u._id !== id))
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete upload.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="font-heading">Recent Uploads</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-primary-green" size={32} />
          </div>
        ) : uploads.length === 0 ? (
          <div className="text-center p-12 text-text-light">
            No upload history found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-text-dark font-semibold">Filename</TableHead>
                  <TableHead className="text-text-dark font-semibold">Subject</TableHead>
                  <TableHead className="text-text-dark font-semibold">Status</TableHead>
                  <TableHead className="text-text-dark font-semibold">Date</TableHead>
                  <TableHead className="text-text-dark font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload, idx) => {
                  const statusConfig = getStatusConfig(upload.status)
                  return (
                    <TableRow
                      key={upload._id ?? `${upload.filename ?? 'upload'}-${upload.createdAt ?? idx}`}
                      className="border-border hover:bg-background-light/50"
                    >
                      <TableCell className="font-medium text-text-dark">
                        {upload.filename}
                      </TableCell>
                      <TableCell className="text-text-light text-sm">
                        {upload.subject}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn('gap-2', statusConfig.badgeClass)}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-light text-sm">
                        {format(new Date(upload.createdAt), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          {upload.status === 'completed' && (
                            <Link href={`/admin/questions?uploadId=${upload._id}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1"
                                title="View questions"
                              >
                                <Eye size={16} />
                                View
                              </Button>
                            </Link>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(upload._id)}
                            disabled={isDeleting === upload._id}
                            className="gap-1 text-error-red hover:text-error-red"
                            title="Delete"
                          >
                            {isDeleting === upload._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
