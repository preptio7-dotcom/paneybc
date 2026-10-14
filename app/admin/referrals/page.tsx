'use client'

import React, { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Users, LayoutDashboard, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'

type Signup = {
  id: string
  newUserName: string
  newUserEmail: string
  signedUpAt: string
  page: string | null
}

type AmbassadorReferralData = {
  id: string
  name: string
  email: string
  referralCode: string | null
  referralLink: string | null
  totalReferrals: number
  signups: Signup[]
}

type ReferralsResponse = {
  ambassadors: AmbassadorReferralData[]
  totalReferrals: number
}

export default function AdminReferralsPage() {
  const { toast } = useToast()
  const [data, setData] = useState<ReferralsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/admin/referrals')
      if (!response.ok) {
        throw new Error('Failed to load referral data')
      }
      const jsonData = await response.json()
      setData(jsonData)
    } catch (err: any) {
      setError(err.message || 'Failed to load referral data. Please try again.')
      toast({
        title: 'Error',
        description: err.message || 'Failed to load referral data',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const totalAmbassadors = data?.ambassadors.length || 0
  const topAmbassador = data?.ambassadors[0]?.totalReferrals > 0 
    ? data.ambassadors[0] 
    : null

  return (
    <div className="min-h-screen bg-background-light">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-text-dark">Ambassador Referrals</h1>
            <p className="text-text-light mt-1">Track signup conversions and monitor ambassador impact.</p>
          </div>
          <Button onClick={loadData} variant="outline" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Refresh
          </Button>
        </div>

        {error ? (
          <Card className="border-red-200 bg-red-50 text-red-900 mb-8">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <p className="font-semibold mb-4">{error}</p>
              <Button onClick={loadData} variant="outline">Try Again</Button>
            </CardContent>
          </Card>
        ) : isLoading && !data ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-green" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Ambassadors</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{totalAmbassadors}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Referral Signups</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-[#0F7938]">{data?.totalReferrals || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Top Ambassador</CardTitle>
                </CardHeader>
                <CardContent>
                  {topAmbassador ? (
                    <div>
                      <p className="text-xl font-bold text-slate-900 truncate">{topAmbassador.name}</p>
                      <p className="text-sm text-slate-500 mt-1">{topAmbassador.totalReferrals} signups</p>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">No conversions yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Ambassador Performance</CardTitle>
                <CardDescription>All ambassadors sorted by maximum signup volume.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {totalAmbassadors === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-lg font-medium text-slate-700">No ambassadors found.</p>
                    <p className="mt-1">Promote users to the ambassador role from the Users page to get started.</p>
                  </div>
                ) : (
                  <table className="w-full min-w-[800px] text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Ambassador</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Referral Code</th>
                        <th className="px-4 py-3 font-semibold text-center">Total Signups</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data?.ambassadors.map(ambassador => (
                        <React.Fragment key={ambassador.id}>
                          <tr className="hover:bg-slate-50 transition-colors group">
                            <td className="px-4 py-3 font-medium text-slate-900">{ambassador.name}</td>
                            <td className="px-4 py-3 text-slate-600">{ambassador.email}</td>
                            <td className="px-4 py-3">
                              {ambassador.referralCode ? (
                                <div className="inline-flex items-center gap-2 bg-slate-100 px-2 py-1 rounded font-mono text-xs border border-slate-200">
                                  {ambassador.referralCode}
                                  <button
                                    onClick={() => copyToClipboard(ambassador.referralCode!, ambassador.id)}
                                    className="text-slate-400 hover:text-slate-700 transition-colors"
                                    title="Copy Code"
                                  >
                                    {copiedCode === ambassador.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs">Pending</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                ambassador.totalReferrals > 0 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {ambassador.totalReferrals}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRow(ambassador.id)}
                                className="text-[#0F7938] hover:text-[#166534] hover:bg-green-50"
                              >
                                {expandedRows.has(ambassador.id) ? (
                                  <><ChevronDown className="w-4 h-4 mr-1" /> Hide Signups</>
                                ) : (
                                  <><ChevronRight className="w-4 h-4 mr-1" /> View Signups</>
                                )}
                              </Button>
                            </td>
                          </tr>
                          {expandedRows.has(ambassador.id) && (
                            <tr>
                              <td colSpan={5} className="bg-slate-50 p-0 border-b border-slate-200">
                                <div className="px-8 py-4">
                                  {ambassador.signups.length === 0 ? (
                                    <p className="text-sm text-slate-500 italic">No signups yet for this ambassador.</p>
                                  ) : (
                                    <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                      <table className="w-full text-sm">
                                        <thead className="bg-[#0F7938]/5 text-[#166534] border-b border-slate-200">
                                          <tr>
                                            <th className="px-4 py-2 text-left font-semibold">Name</th>
                                            <th className="px-4 py-2 text-left font-semibold">Email</th>
                                            <th className="px-4 py-2 text-left font-semibold">Signed Up</th>
                                            <th className="px-4 py-2 text-left font-semibold">Source Page</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {ambassador.signups.map((signup) => {
                                            const date = new Date(signup.signedUpAt)
                                            return (
                                              <tr key={signup.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-2 text-slate-900">{signup.newUserName}</td>
                                                <td className="px-4 py-2 text-slate-600">{signup.newUserEmail}</td>
                                                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                                                  {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })},{' '}
                                                  {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                </td>
                                                <td className="px-4 py-2">
                                                  <span className="inline-flex bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600">
                                                    {signup.page || 'signup'}
                                                  </span>
                                                </td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
