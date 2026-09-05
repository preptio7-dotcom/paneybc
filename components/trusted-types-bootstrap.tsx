'use client'

import Script from 'next/script'

export function TrustedTypesBootstrap() {
  return (
    <Script id="preptio-trusted-types" strategy="beforeInteractive">
      {`
        try {
          if (window.trustedTypes && window.trustedTypes.createPolicy) {
            window.trustedTypes.createPolicy('default', {
              createHTML: function(input) { return input; },
              createScript: function(input) { return input; },
              createScriptURL: function(input) { return input; },
            });
          }
        } catch (error) {
          // Ignore duplicate policy errors and keep rendering.
          console.warn('Trusted Types policy initialization skipped:', error);
        }
      `}
    </Script>
  )
}

