'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ShieldAlert, RefreshCw } from 'lucide-react'

export function AdBlockDetector() {
    const pathname = usePathname()
    const [adBlockDetected, setAdBlockDetected] = useState(false)

    // Only run on the home page or blog paths
    const isAllowedPath = pathname === '/' || pathname === '/blog' || pathname.startsWith('/blog/')

    useEffect(() => {
        if (!isAllowedPath) return
        const checkAdBlock = () => {
            let isBlocked = false

            // Bait Element Check - adblockers will inject aggressive styles to hide this
            const bait = document.createElement('div')
            bait.className = 'ad-banner pub_300x250 pub_300x250m ad-slot ad-container advertisement text-ad banner-ad'
            bait.style.position = 'absolute'
            bait.style.left = '-9999px'
            bait.style.height = '10px'
            bait.style.width = '10px' // Must have dimensions to be detected as "hidden"
            document.body.appendChild(bait)

            // Wait for the browser and extensions to calculate styles
            setTimeout(() => {
                if (!document.body.contains(bait)) {
                    // Extension flat out deleted it
                    isBlocked = true
                } else {
                    const style = window.getComputedStyle(bait)
                    if (style.display === 'none' || style.visibility === 'hidden' || bait.offsetHeight === 0) {
                        isBlocked = true
                    }
                    document.body.removeChild(bait)
                }

                if (isBlocked) {
                    setAdBlockDetected(true)
                } else {
                    // Method 2: Network interception check.
                    // Extensions will aggressively block requests to this domain.
                    fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
                        method: 'HEAD',
                        mode: 'no-cors',
                        cache: 'no-store',
                    }).then(() => {
                        // Request succeeded, so no adblocker intercepted it.
                        setAdBlockDetected(false)
                    }).catch(() => {
                        // The extension intercepted the request at the network level!
                        setAdBlockDetected(true)
                    })
                }
            }, 50)
        }

        // Run the check shortly after mount
        const timer = setTimeout(checkAdBlock, 300)

        // Continue running it to prevent users from toggling extension off, navigating, then turning it on again
        const intervalId = setInterval(checkAdBlock, 2500)

        return () => {
            clearTimeout(timer)
            clearInterval(intervalId)
        }
    }, [])

    if (!isAllowedPath || !adBlockDetected) return null

    return (
        <>
            {/* Strict Code Enforcement: Turn off the display for all regular elements so even if they delete this overlay in the Elements Panel, the site remains invisible. */}
            <style dangerouslySetInnerHTML={{
                __html: `
        body > *:not(#adblock-enforcer) {
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          max-height: 0 !important;
          overflow: hidden !important;
        }
        body {
          overflow: hidden !important;
        }
      `}} />

            <div
                id="adblock-enforcer"
                className="fixed inset-0 z-[999999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300"
                style={{ pointerEvents: 'auto' }}
            >
                <div className="bg-white rounded-[24px] max-w-lg w-full p-8 md:p-10 shadow-[0_32px_64px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-orange-500" />

                    <div className="mx-auto w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
                        <ShieldAlert size={32} />
                    </div>

                    <h2 className="text-2xl font-black text-center text-slate-900 mb-4">
                        Ad Blocker Detected
                    </h2>

                    <div className="space-y-4 text-slate-600 mb-8 px-2 md:px-0">
                        <p className="text-center font-medium md:text-base text-sm">
                            We noticed you are using an ad blocker.
                        </p>
                        <p className="text-[13px] md:text-sm text-center leading-relaxed">
                            Preptio is completely free for all CA students. To keep it that way, we rely on a few high-quality, harmless advertisements that you'll barely even notice.
                        </p>
                        <p className="text-[13px] text-center leading-relaxed font-medium text-slate-800 bg-[#f0fdf4] p-4 rounded-xl border border-[#bbf7d0]">
                            <strong className="text-primary-green block mb-1">Our Promise:</strong> No annoying pop-ups, no tracking malware, and no intrusive videos that ruin your study flow. Just clean, silent ads.
                        </p>
                        <p className="text-sm text-center text-slate-600 font-bold">
                            Please pause your ad blocker for Preptio to continue. It means a lot!
                        </p>
                    </div>

                    <button
                        type="button"
                        className="w-full h-14 rounded-xl text-base font-bold flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 transition-colors text-white shadow-lg shadow-slate-900/20 active:scale-[0.98]"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw size={20} />
                        I've disabled it (Refresh Page)
                    </button>
                </div>
            </div>
        </>
    )
}
