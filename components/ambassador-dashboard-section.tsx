'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Copy, Sparkles, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface ReferralSignup {
  name: string
  joinedAt: string
}

interface ReferralData {
  total: number
  signups: ReferralSignup[]
}

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

export function AmbassadorDashboardSection() {
  const { user } = useAuth()
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  if (user?.studentRole !== 'ambassador') {
    return null
  }

  const referralCode = user.referralCode || 'PENDING'
  const referralLink = user.referralLink || 'PENDING'

  const copyToClipboard = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'link') {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      } else {
        setCopiedCode(true)
        setTimeout(() => setCopiedCode(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const [referralsData, setReferralsData] = useState<ReferralData | null>(null)
  const [loadingReferrals, setLoadingReferrals] = useState(true)

  useEffect(() => {
    async function fetchReferrals() {
      try {
        const res = await fetch('/api/ambassador/referral-signups')
        if (res.ok) {
          const data = await res.json()
          setReferralsData(data)
        }
      } catch (error) {
        console.error('Failed to load referrals', error)
      } finally {
        setLoadingReferrals(false)
      }
    }
    fetchReferrals()
  }, [])

  return (
    <div className="space-y-6">
    <Card className="border-0 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0d2137,#059669)] text-white shadow-xl relative mt-0 mb-6 group border-t border-[#34d399]/30">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#10b981]/20 blur-2xl group-hover:bg-[#10b981]/30 transition-colors duration-700" />
        <div className="absolute -bottom-16 left-0 h-44 w-44 rounded-full bg-[#34d399]/10 blur-2xl flex items-center justify-center">
        </div>
      </div>

      <CardContent className="p-6 md:p-8 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a7f3d0]">
                Ambassador Mode
              </h2>
            </div>
            <p className="text-sm md:text-base text-white/90 leading-relaxed max-w-xl">
              Share this link with your friends. You can track your impact here. Experience the premium features tailored just for our ambassadors.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[320px] bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70 font-bold mb-1 ml-1">Your Referral Link</p>
              <div className="flex items-stretch flex-row gap-2">
                <div className="bg-black/20 text-white/90 px-3 py-2 rounded-xl text-sm truncate font-mono flex-1 border border-white/10 flex items-center shadow-inner">
                  {referralLink}
                </div>
                <Button 
                  size="icon" 
                  variant="secondary"
                  className="bg-white text-[#059669] hover:bg-white/90 border-0 shrink-0 h-auto self-stretch w-10 aspect-square shadow-sm rounded-xl"
                  onClick={() => copyToClipboard(referralLink, 'link')}
                  title="Copy Link"
                >
                  {copiedLink ? <Check size={16} className="text-[#059669]" /> : <Copy size={16} />}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-white/70 font-bold mb-1 ml-1">Your Code</p>
              <div className="flex items-stretch flex-row gap-2">
                <div className="bg-black/20 text-white/90 px-3 py-2 rounded-xl text-sm font-bold tracking-widest truncate font-mono flex-1 border border-white/10 flex items-center shadow-inner justify-center">
                  {referralCode}
                </div>
                <Button 
                  size="icon" 
                  variant="secondary"
                  className="bg-white/20 text-white hover:bg-white/30 border border-white/30 shrink-0 h-auto self-stretch w-10 aspect-square shadow-sm rounded-xl"
                  onClick={() => copyToClipboard(referralCode, 'code')}
                  title="Copy Code"
                >
                  {copiedCode ? <Check size={16} className="text-white" /> : <Copy size={16} />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="rounded-[20px] border border-slate-200 shadow-sm mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#16a34a]" />
          My Referrals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loadingReferrals ? (
          <div className="space-y-4">
            <div className="h-6 w-48 bg-slate-100 rounded animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center pb-3 border-b border-slate-100 last:border-0">
                  <div className="h-5 w-32 bg-slate-100 rounded animate-pulse"></div>
                  <div className="h-4 w-20 bg-slate-100 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ) : referralsData ? (
          <div className="space-y-6">
            <div className="text-lg font-medium text-slate-800">
              <span className="text-2xl font-black text-[#16a34a] mr-2">
                {referralsData.total}
              </span>
              student{referralsData.total !== 1 ? 's' : ''} joined via your link
            </div>
            
            {referralsData.signups.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4">
                {referralsData.signups.map((signup, idx) => (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="font-semibold text-slate-900 text-sm">
                      {signup.name}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      {timeAgo(signup.joinedAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500 text-sm font-medium">
                  No signups yet — share your link to get started!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-red-500">Failed to load referrals.</div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
