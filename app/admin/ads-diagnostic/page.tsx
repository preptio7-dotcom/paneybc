'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useSystemSettings } from '@/hooks/use-system-settings'
import { shouldLoadAdsForContext } from '@/lib/ad-access'
import { usePathname } from 'next/navigation'

export default function AdsDiagnosticPage() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { settings, loading } = useSystemSettings()
  const [diagnostic, setDiagnostic] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    if (!loading && pathname && user) {
      const config = settings?.adSenseConfig || {
        globalEnabled: true,
        allowedPaths: ['/', '/blog', '/blog/*'],
        blockedPaths: ['/admin/*', '/dashboard/*', '/auth/*', '/register'],
        showAdsToUnpaid: true,
        showAdsToPaid: false,
        showAdsToAmbassador: false,
      }

      const shouldShowAds = shouldLoadAdsForContext('/', user, config)
      const shouldShowAdsBlog = shouldLoadAdsForContext('/blog', user, config)

      const diag = {
        currentUrl: pathname,
        userInfo: {
          id: user?.id,
          role: user?.role,
          studentRole: user?.studentRole,
        },
        settings: {
          loaded: !loading,
          adsEnabled: settings?.adsEnabled,
          globalEnabled: config?.globalEnabled,
          allowedPaths: config?.allowedPaths,
          blockedPaths: config?.blockedPaths,
        },
        adEligibility: {
          'Homepage (/)': shouldShowAds,
          'Blog (/blog)': shouldShowAdsBlog,
        },
        scriptStatus: {
          adsbygoogleExists: typeof (window as any).adsbygoogle !== 'undefined',
          adsbygoogleIsArray: Array.isArray((window as any).adsbygoogle),
        },
      }

      setDiagnostic(diag)
    }
  }, [loading, pathname, user, settings])

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return <div className="p-4 text-red-600">Admin access required</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Google AdSense Diagnostic</h1>
      
      <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-6">
        <h2 className="font-bold text-blue-900 mb-2">Quick Checklist:</h2>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>✓ Is <code className="bg-white px-2 py-1">globalEnabled</code> set to <strong>true</strong>?</li>
          <li>✓ Does <strong>Homepage</strong> and <strong>Blog</strong> show <code className="bg-white px-2 py-1">true</code> in adEligibility?</li>
          <li>✓ Is <code className="bg-white px-2 py-1">adsbygoogleExists</code> <strong>true</strong> after page loads?</li>
          <li>✓ Have you created/approved the ad slots in AdSense dashboard?</li>
        </ul>
      </div>

      {diagnostic && (
        <div className="space-y-6">
          <div className="border rounded p-4">
            <h3 className="font-bold mb-3">Your Current Status</h3>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(diagnostic, null, 2)}
            </pre>
          </div>

          <div className="border rounded p-4 bg-yellow-50">
            <h3 className="font-bold text-yellow-900 mb-2">Common Issues & Solutions:</h3>
            <div className="space-y-3 text-sm text-yellow-800">
              {!diagnostic.settings.globalEnabled && (
                <div>
                  <strong>❌ Ads are GLOBALLY DISABLED</strong>
                  <p>Go to <code className="bg-white px-1">/admin/ads</code> and toggle "Enable AdSense" ON</p>
                </div>
              )}
              
              {!diagnostic.adEligibility['Homepage (/)'] && (
                <div>
                  <strong>❌ Homepage ads blocked</strong>
                  <p>Check if "/" is in your allowedPaths. Currently: {diagnostic.settings.allowedPaths?.join(', ')}</p>
                </div>
              )}
              
              {!diagnostic.adEligibility['Blog (/blog)'] && (
                <div>
                  <strong>❌ Blog ads blocked</strong>
                  <p>Check if "/blog" or "/blog/*" is in your allowedPaths. Currently: {diagnostic.settings.allowedPaths?.join(', ')}</p>
                </div>
              )}

              {(diagnostic.userInfo.role === 'admin' || diagnostic.userInfo.role === 'super_admin') && (
                <div>
                  <strong>⚠️ Admins don't see ads by design</strong>
                  <p>Log out and check as a regular user, or check browser console after Ctrl+Shift+J</p>
                </div>
              )}

              <div>
                <strong>📝 To verify ads load in browser:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Open DevTools (F12 or Ctrl+Shift+J)</li>
                  <li>Go to Network tab</li>
                  <li>Filter for "pagead2.googlesyndication.com"</li>
                  <li>Refresh page - should see script load with 200 status</li>
                  <li>Check Console for "[Adsense Debug]" messages</li>
                </ol>
              </div>

              <div>
                <strong>🔑 Google AdSense Requirements:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Ad slots (7458772554, 8411378687) must exist in your AdSense account</li>
                  <li>Slots must be approved/active (not pending review)</li>
                  <li>Publisher ID must match: ca-pub-5583540622875378</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border rounded p-4 bg-green-50">
            <h3 className="font-bold text-green-900 mb-2">✅ If All Above is True:</h3>
            <p className="text-sm text-green-800">
              Your setup is correct. Ads might be showing but appear as blank spaces (common before approval). 
              Check your AdSense dashboard for "test ads" or wait for Google to fully approve your slots.
            </p>
          </div>
        </div>
      )}

      {loading && <div className="text-gray-600">Loading diagnostic data...</div>}
    </div>
  )
}
