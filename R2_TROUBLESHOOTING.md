# R2 Image Loading Troubleshooting Guide

## Issue
Payment proof images stored on Cloudflare R2 are failing to load with `net::ERR_FAILED` error.

## Root Causes
The error suggests one of the following:
1. R2 bucket is not publicly accessible
2. CORS headers are not configured correctly
3. R2 access token permissions are insufficient
4. Network/firewall blocking

## Solutions

### Solution 1: Enable Public Access to R2 Bucket

**If you already can see images in R2**, they're being stored correctly. Use one of these methods:

#### Method A: Using R2 Custom Domain (Recommended)

1. **In Cloudflare Dashboard → R2**
   - Select your bucket
   - Go to **Settings** tab

2. **Look for "Custom Domains" or "Domain Access"**
   - Try adding a custom domain: `cdn.preptio.com` (or any subdomain you own)
   - OR use the default R2 link provided

3. **Check if there's a "Public Access" toggle**
   - Some versions show: **Bucket → Settings → Disable Bucket Access** (turn OFF if ON)
   - Or look for: **Settings → Auth → Public Read Access**

#### Method B: Direct R2 URL (if custom domain not available)

The URL format you're likely using: `https://pub-xxxxx.r2.dev/...`

This URL should work directly. If images still fail to load in browser:
- The issue is **CORS**, not public access
- Skip to Solution 2 (Configure CORS Headers) below

#### Method C: R2 API Token with Full Access

If you can't find public access settings:

1. **Create/Check R2 API Token permissions**
   - Go to **Account Settings → API Tokens**
   - Create token with **R2:Read** access (minimum)
   - Or ensure existing token has full R2 permissions

2. **Test bucket access:**
   ```bash
   # Replace with your details
   curl -I https://pub-xxxxx.r2.dev/subscription-proofs/test.jpg
   ```
   - Should return `200 OK` or status code 206
   - If `403 Forbidden`: bucket access is restricted
   - If `404 Not Found`: file doesn't exist at that path

### Solution 2: Configure CORS Headers

If public access is enabled but images still fail:

1. **In R2 Bucket Settings**
   - Go to **Settings** tab
   - Click on **CORS Policy** section

2. **Clear the text editor and add this JSON**:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["Content-Length", "ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

3. **Click Save** - wait a few minutes for changes to propagate

**Important Notes:**
- Must be valid JSON format (quotes around keys and values)
- Use `MaxAgeSeconds` not `Max Age`
- Methods/headers use square bracket arrays `[]`
- Origin can be `"*"` for all domains or specify: `"https://yourdomain.com"`

**If CORS editor shows "This policy is not valid":**
- Check the JSON syntax above - make sure all quotes are present
- Make sure no trailing commas
- Copy the exact JSON format provided

**If you can't find CORS Policy section**, try Solution 3 (Next.js Proxy Endpoint) below.

### Solution 2.5: Using Cloudflare Dashboard Alternative

If CORS settings aren't visible in your bucket:

1. **Try going to:** Account Home → R2 → [Your Bucket] → **Settings → CORS Policy**
2. **If the editor says "This policy is not valid"**, it means the JSON format is wrong
3. **Delete everything and paste this exact JSON:**
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["Content-Length", "ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. **Common mistakes to check:**
   - Missing quotes around keys and values
   - Using `Max Age` instead of `MaxAgeSeconds`
   - Not using square brackets for arrays
   - Trailing commas after closing brackets

3. **If still not visible:**
   - Your bucket might already have public access enabled
   - Problem is likely CORS format (use JSON above)
   - If stuck, proceed to Solution 3 (Next.js Proxy)

### Solution 3: Use Next.js Proxy Endpoint (If CORS Can't Be Configured)

If you can't find or configure CORS in Cloudflare, use a simple workaround:

Create this file: `app/api/proxy/r2-image/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url || !url.startsWith('https://pub-')) {
    return NextResponse.json(
      { error: 'Invalid R2 URL' },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    )
  }
}
```

Then update `components/payment-proof-viewer.tsx`:

```typescript
// Change this line:
// src={url}

// To this:
// src={`/api/proxy/r2-image?url=${encodeURIComponent(url)}`}
```

This bypasses CORS entirely by proxying through your Next.js server.

### Solution 4: Use Cloudflare Workers as Proxy

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const objectKey = url.pathname.slice(1) // Remove leading slash
    const object = await env.BUCKET.get(objectKey)

    if (object === null) {
      return new Response('Object not found', { status: 404 })
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    headers.set('Access-Control-Allow-Headers', '*')
    headers.set('Cache-Control', 'public, max-age=3600')

    return new Response(object.body, { headers })
  },
}
```

### Solution 5: Verify CORS via Command Line

Test if CORS is working:

```bash
curl -i -X OPTIONS \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: GET" \
  https://pub-xxx.r2.dev/subscription-proofs/test.jpg
```

You should see these headers in response:
- `access-control-allow-origin: *` (or your domain)
- `access-control-allow-methods: GET, HEAD, OPTIONS`

## Testing the Fix

1. **After making R2 changes:**
   - Wait a few minutes for changes to propagate

2. **Test the admin payment proof viewer:**
   - Go to **Admin -> Subscriptions**
   - Click "View Proof" on an approved subscription
   - Image should load without errors

3. **Check browser console:**
   - Open DevTools (F12)
   - Check Console and Network tabs
   - Images should load with status 200, not error

## Quick Diagnostic Checklist

- [ ] R2 bucket has public access enabled
- [ ] CORS headers are configured
- [ ] R2 Object URL is correct format: `https://pub-xxxxx.r2.dev/subscription-proofs/filename.ext`
- [ ] Image files exist in R2 bucket (upload) test image to verify
- [ ] Firewall/security rules allowing access
- [ ] Browser cache cleared (Ctrl+Shift+Delete)

## 🔧 Quick Fix - Most Likely Solution

Since you **can see images in R2**, the issue is almost certainly **CORS**, not access:

1. **Go to your bucket → Settings tab → CORS Policy**
2. **Clear the editor and paste this exact JSON:**
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["Content-Length", "ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
3. **Click Save**
4. **Wait 2-3 minutes** for changes to propagate
5. **Refresh your admin subscriptions page** and try viewing proof again

**Important**: The JSON must have:
- Quotes around all keys and string values
- Square brackets `[]` for arrays
- Use `MaxAgeSeconds` (not `Max Age`)

If you still can't find the CORS section, continue to Solution 3 below.

## If Still Not Working

1. **Check R2 Logs**
   - Go to R2 bucket Analytics tab
   - Check for error patterns

2. **Verify Database URLs**
   - Run: `SELECT paymentProofUrl FROM "SubscriptionRequest" LIMIT 5;`
   - Ensure URLs start with `https://pub-` (not HTTP)

3. **Test R2 URL Directly**
   - Copy a URL from database
   - Paste directly in browser address bar
   - Should either show image or trigger download

4. **Environment Variables**
   - Verify `R2_BUCKET_NAME` is correct
   - Verify `R2_PUBLIC_URL` is correct

## Next Steps if Persistent

Contact Cloudflare support with:
- R2 bucket name
- Error logs from DevTools
- CORS configuration settings
- Verification that bucket is marked as public
