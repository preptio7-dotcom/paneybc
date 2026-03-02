'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { getAdEligibilityInfo, shouldLoadAdsForContext, shouldShowAdblockPrompt } from '@/lib/ad-access'

const ADSENSE_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5583540622875378'
const ADBLOCK_SESSION_KEY = 'preptio_adblock_passed'

type ScriptStatus = 'idle' | 'loaded' | 'error'

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function detectAdblocker() {
  return new Promise<boolean>((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false)
      return
    }

    const bait = document.createElement('div')
    bait.className = 'adsbox adsbygoogle ad-banner ad-unit text-ad'
    bait.setAttribute(
      'style',
      'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;'
    )
    document.body.appendChild(bait)

    window.setTimeout(() => {
      const style = window.getComputedStyle(bait)
      const blocked =
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        bait.offsetHeight === 0 ||
        bait.clientHeight === 0

      bait.remove()
      resolve(blocked)
    }, 120)
  })
}

function probeAdSenseScriptLoad() {
  return new Promise<boolean>((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false)
      return
    }

    let finished = false
    const script = document.createElement('script')
    script.src = ADSENSE_SRC
    script.async = true
    script.crossOrigin = 'anonymous'
    script.setAttribute('data-preptio-ad-probe', '1')

    const finish = (blocked: boolean) => {
      if (finished) return
      finished = true
      window.clearTimeout(timeoutId)
      script.onload = null
      script.onerror = null
      script.remove()
      resolve(blocked)
    }

    const timeoutId = window.setTimeout(() => finish(true), 2500)
    script.onload = () => finish(false)
    script.onerror = () => finish(true)
    document.head.appendChild(script)
  })
}

export function AdExperienceGuard() {
  const pathname = usePathname() || '/'
  const { user, loading } = useAuth()

  const [sessionReady, setSessionReady] = useState(false)
  const [sessionPassed, setSessionPassed] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [isRechecking, setIsRechecking] = useState(false)
  const [recheckMessage, setRecheckMessage] = useState('')
  const [scriptStatus, setScriptStatus] = useState<ScriptStatus>('idle')

  const adEligibility = useMemo(() => {
    if (loading) return null
    return getAdEligibilityInfo(pathname, user)
  }, [loading, pathname, user])

  const showAdminDebugBadge =
    process.env.NODE_ENV === 'development' &&
    Boolean(!loading && user && (user.role === 'admin' || user.role === 'super_admin') && adEligibility)

  useEffect(() => {
    try {
      setSessionPassed(sessionStorage.getItem(ADBLOCK_SESSION_KEY) === '1')
    } catch {
      setSessionPassed(false)
    } finally {
      setSessionReady(true)
    }
  }, [])

  const shouldLoadScript = useMemo(() => {
    if (loading) return false
    return shouldLoadAdsForContext(pathname, user)
  }, [loading, pathname, user])

  const shouldCheckAdblock = useMemo(() => {
    if (loading || !sessionReady || sessionPassed) return false
    return shouldShowAdblockPrompt(pathname, user)
  }, [loading, sessionReady, sessionPassed, pathname, user])

  const markSessionPassed = useCallback(() => {
    try {
      sessionStorage.setItem(ADBLOCK_SESSION_KEY, '1')
    } catch {
      // ignore storage errors
    }
    setSessionPassed(true)
    setShowOverlay(false)
    setRecheckMessage('')
  }, [])

  const runAdblockDetection = useCallback(async () => {
    const baitBlocked = await detectAdblocker()
    if (baitBlocked) return true

    if (scriptStatus === 'error') return true
    if (scriptStatus === 'loaded') return false

    await wait(1200)
    if (scriptStatus === 'error') return true
    if (scriptStatus === 'loaded') return false

    if (typeof window !== 'undefined' && Array.isArray((window as any).adsbygoogle)) {
      return false
    }

    return probeAdSenseScriptLoad()
  }, [scriptStatus])

  useEffect(() => {
    if (!shouldCheckAdblock) {
      setShowOverlay(false)
      setRecheckMessage('')
      return
    }

    let active = true
    const check = async () => {
      const blocked = await runAdblockDetection()
      if (!active) return
      if (blocked) {
        setShowOverlay(true)
        return
      }
      markSessionPassed()
    }

    check()
    return () => {
      active = false
    }
  }, [shouldCheckAdblock, markSessionPassed, runAdblockDetection])

  const handleContinue = async () => {
    setIsRechecking(true)
    setRecheckMessage('')
    const blocked = await runAdblockDetection()
    if (!blocked) {
      markSessionPassed()
      setIsRechecking(false)
      return
    }

    setRecheckMessage(
      "We still detect an ad blocker. Please make sure it's fully disabled for preptio.com and try again."
    )
    setShowOverlay(true)
    setIsRechecking(false)
  }

  return (
    <>
      {shouldLoadScript ? (
        <Script
          id="google-adsense-script"
          async
          src={ADSENSE_SRC}
          crossOrigin="anonymous"
          strategy="lazyOnload"
          onLoad={() => setScriptStatus('loaded')}
          onError={() => setScriptStatus('error')}
        />
      ) : null}

      {showOverlay ? (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center px-4">
          <Card className="w-full max-w-xl border border-emerald-200 shadow-2xl">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-text-dark">
                Please Disable Your Ad Blocker 🙏
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-text-light leading-relaxed">
                Preptio is completely free to use and ads help us keep it that way. Please whitelist
                Preptio or disable your ad blocker to continue. It only takes a second and means a lot
                to us!
              </p>
              {recheckMessage ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {recheckMessage}
                </p>
              ) : null}
              <Button
                onClick={handleContinue}
                disabled={isRechecking}
                className="w-full bg-primary-green hover:bg-primary-green/90"
              >
                {isRechecking ? 'Checking...' : "I've Disabled My Ad Blocker - Continue"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showAdminDebugBadge ? (
        <div className="fixed bottom-4 right-4 z-[9900] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-emerald-200 bg-white/95 backdrop-blur p-3 shadow-xl">
          <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-700 font-bold">Ad Debug</p>
          <p className="mt-1 text-xs text-slate-600 break-all">
            <span className="font-semibold text-slate-800">Route:</span> {pathname}
          </p>
          <p className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Role:</span> {user?.role || 'guest'}
            {' / '}
            <span className="font-semibold text-slate-800">Student:</span> {user?.studentRole || 'n/a'}
          </p>
          <p className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Ad Eligible:</span>{' '}
            {adEligibility?.eligible ? 'Yes' : 'No'}
          </p>
          <p className="text-xs text-slate-600 break-all">
            <span className="font-semibold text-slate-800">Reason:</span> {adEligibility?.reason}
          </p>
          <p className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">AdBlock Check:</span>{' '}
            {shouldCheckAdblock ? 'Active' : 'Skipped'}
          </p>
        </div>
      ) : null}
    </>
  )
}
