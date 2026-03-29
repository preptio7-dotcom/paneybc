'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle, Clock, Eye, Loader2 } from 'lucide-react'

type SubscriptionRequest = {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  plan: 'one_month' | 'lifetime'
  paymentProofUrl: string
  paymentMethod: string
  user: {
    id: string
    name: string
    email: string
    studentId?: string
    cenNumber?: string
  }
  createdAt: string
  adsFreeUntil?: string | null
}

export default function AdminSubscriptionsPage() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<SubscriptionRequest[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequest | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const loadRequests = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/admin/subscriptions/requests?status=${statusFilter}&page=${currentPage}&limit=10`
      )
      if (!response.ok) throw new Error('Failed to load requests')
      const data = await response.json()
      setRequests(data.requests)
      setTotal(data.total)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load subscription requests',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [statusFilter, currentPage])

  const handleApprove = async (requestId: string) => {
    try {
      setProcessingId(requestId)
      const response = await fetch('/api/admin/subscriptions/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'approve' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve')
      }

      toast({
        title: 'Approved',
        description: 'Subscription request approved successfully',
      })

      setShowPreview(false)
      setSelectedRequest(null)
      await loadRequests()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Missing reason',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      })
      return
    }

    try {
      setProcessingId(requestId)
      const response = await fetch('/api/admin/subscriptions/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'reject', rejectionReason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject')
      }

      toast({
        title: 'Rejected',
        description: 'Subscription request rejected',
      })

      setShowRejectDialog(false)
      setSelectedRequest(null)
      setRejectionReason('')
      await loadRequests()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPlanLabel = (plan: string) => {
    return plan === 'one_month' ? '1 Month (PKR 200)' : 'Lifetime (PKR 1,200)'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
            <Clock className="w-3 h-3" /> Pending
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        )
      default:
        return status
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-text-dark">Subscription Requests</h1>
              <p className="text-text-light">Manage user subscription requests and approve/reject them</p>
            </div>
            <Link href="/admin">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>

          {/* Status Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => {
                    setStatusFilter('all')
                    setCurrentPage(1)
                  }}
                >
                  All ({total})
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => {
                    setStatusFilter('pending')
                    setCurrentPage(1)
                  }}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'approved' ? 'default' : 'outline'}
                  onClick={() => {
                    setStatusFilter('approved')
                    setCurrentPage(1)
                  }}
                >
                  Approved
                </Button>
                <Button
                  variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                  onClick={() => {
                    setStatusFilter('rejected')
                    setCurrentPage(1)
                  }}
                >
                  Rejected
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Requests List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-text-light">
                No subscription requests found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-dark mb-1">{request.user.name}</h3>
                        <p className="text-sm text-text-light mb-3">{request.user.email}</p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-text-light">Plan:</span>
                            <p className="font-medium text-text-dark">{getPlanLabel(request.plan)}</p>
                          </div>
                          <div>
                            <span className="text-text-light">Payment Method:</span>
                            <p className="font-medium text-text-dark">{request.paymentMethod}</p>
                          </div>
                          <div>
                            <span className="text-text-light">Status:</span>
                            <p className="mt-1">{getStatusBadge(request.status)}</p>
                          </div>
                          <div>
                            <span className="text-text-light">Requested:</span>
                            <p className="font-medium text-text-dark text-xs">{formatDate(request.createdAt)}</p>
                          </div>
                        </div>

                        {request.user.studentId && (
                          <p className="text-xs text-text-light mt-3">
                            Student ID: {request.user.studentId}
                            {request.user.cenNumber && ` | CEN: ${request.user.cenNumber}`}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request)
                            setShowPreview(true)
                          }}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" /> View Proof
                        </Button>

                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={processingId === request.id}
                              onClick={() => handleApprove(request.id)}
                            >
                              {processingId === request.id ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={processingId === request.id}
                              onClick={() => {
                                setSelectedRequest(request)
                                setShowRejectDialog(true)
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && total > 10 && (
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center text-text-light">
                Page {currentPage}
              </span>
              <Button
                variant="outline"
                disabled={currentPage * 10 >= total}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Proof Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>
              {selectedRequest?.user.name} - {getPlanLabel(selectedRequest?.plan || '')}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest?.paymentProofUrl && (
            <div className="space-y-4">
              {selectedRequest.paymentProofUrl.endsWith('.pdf') ? (
                <p className="text-text-light">
                  <a
                    href={selectedRequest.paymentProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    📄 Open PDF in new tab
                  </a>
                </p>
              ) : (
                <img
                  src={selectedRequest.paymentProofUrl}
                  alt="Payment proof"
                  className="max-w-full h-auto rounded-lg"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Subscription Request</DialogTitle>
            <DialogDescription>
              Rejecting request from {selectedRequest?.user.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why you're rejecting this request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-24 mt-2"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setSelectedRequest(null)
                setRejectionReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={processingId === selectedRequest?.id || !rejectionReason.trim()}
              onClick={() => selectedRequest && handleReject(selectedRequest.id)}
            >
              {processingId === selectedRequest?.id ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
