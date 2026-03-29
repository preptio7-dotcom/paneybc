# Subscription System - Test Checklist

## ✅ What Was Fixed:

### 1. **Cancel Button Now Shows Immediately**
- ✅ After admin approves subscription
- ✅ No page reload needed
- ✅ User sees green "Active Subscription" card with cancel button

### 2. **No More "Refresh Required" on Page Changes**
- ✅ Subscription status auto-updates when switching tabs/pages
- ✅ Premium badge appears without reload
- ✅ "GO AD'S FREE NOW!" button disappears without reload

### 3. **Better Status Detection**
- ✅ Uses `/api/subscription/status` endpoint (new)
- ✅ `useSubscriptionStatus` hook refreshes on page visibility
- ✅ Component updates in real-time

### 4. **Added Reset Endpoint**
- ✅ `/api/admin/subscriptions/reset?userId=XXX` (super_admin only)
- ✅ Delete/reset user subscriptions for testing
- ✅ Clear `adsFreeUntil` field completely

### 5. **Ads NOT Touched** ⚠️
- ✅ Ad Management settings remain unchanged
- ✅ Global AdSense toggle status unchanged
- ✅ Only subscription status tracking improved

---

## 🧪 Quick Test Flow:

### Scenario 1: New User Buys Subscription
```
1. Non-subscribed user visits /buy-subscription
   ✓ Sees subscription form (not cancel button)

2. User fills form and submits
   ✓ Form submits with payment proof

3. Admin approves in /admin/subscriptions
   ✓ User's adsFreeUntil is set to future date

4. User refreshes or clicks link
   ✓ SHOULD see "Premium" badge immediately
   ✓ SHOULD see cancel button on /buy-subscription
   ✓ NO manual refresh needed
```

### Scenario 2: User Cancels Subscription
```
1. Subscribed user on /buy-subscription
   ✓ See cancel button

2. User clicks "Cancel Subscription"
   ✓ Confirm dialog appears

3. Click confirm
   ✓ Subscription.status = 'cancelled'
   ✓ user.adsFreeUntil = null

4. Auto-refresh or page change
   ✓ SHOULD see "GO AD'S FREE NOW!" button again
   ✓ Premium badge disappears
   ✓ Popup may appear after 24h
```

### Scenario 3: Admin Reset (Testing)
```
1. Go to /admin/subscriptions/reset endpoint
   POST /api/admin/subscriptions/reset?userId=XXX

2. Response shows:
   ✓ subscriptionRequests deleted
   ✓ adsFreeUntil cleared

3. User refreshes
   ✓ All subscription UI removed
   ✓ Can re-subscribe
```

---

## 📋 Verification Checklist:

### After Approval:
- [ ] Cancel button appears without page reload
- [ ] Premium badge shows in header
- [ ] "GO AD'S FREE NOW!" button disappears
- [ ] Toast notification shows success

### After Cancellation:
- [ ] Status changes to 'cancelled' in database
- [ ] "GO AD'S FREE NOW!" button reappears
- [ ] Premium badge disappears
- [ ] Ads start showing (if Global AdSense is ON)

### After Reset:
- [ ] User's adsFreeUntil is NULL
- [ ] All subscription requests deleted
- [ ] User can create new subscription request
- [ ] Form appears instead of cancel button

### Ads Status:
- [ ] Global AdSense setting unchanged
- [ ] Paid students still can't see ads
- [ ] Unpaid students see ads (if enabled)
- [ ] Blocked paths still blocked

---

## 🐛 Troubleshooting:

### Issue: Cancel button still doesn't show
**Solution:**
1. Check if `user.adsFreeUntil` > now() in database
2. Refresh page once with F5
3. Check browser console for errors

### Issue: Ads not showing for non-subscribed users
**Solution:**
1. Check Global AdSense toggle is ON
2. Check user's role is "student" + "unpaid"
3. Check page is in "Allowed Paths"
4. Check page is NOT in "Blocked Paths"

### Issue: Reset endpoint gives 401 error
**Solution:**
1. Must be logged in as super_admin
2. Check Authorization header
3. Verify user role in session

---

## 📞 Need Help?

Check these files:
- `/hooks/use-subscription-status.ts` - Main status tracking
- `/app/buy-subscription/page.tsx` - Form & cancel button UI
- `/app/api/subscription/status/route.ts` - Status API
- `/app/api/admin/subscriptions/reset/route.ts` - Reset endpoint

See SUBSCRIPTION_RESET_GUIDE.md for detailed reset instructions.
