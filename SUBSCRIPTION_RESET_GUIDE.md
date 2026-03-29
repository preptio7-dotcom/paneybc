# Subscription Testing Guide

## Resetting a User's Subscription (For Testing)

**Endpoint:** `POST /api/admin/subscriptions/reset`

**Parameters:**
- `userId` (required) - The user's ID to reset

### Steps to Reset Ali's Subscription:

#### Option 1: Using curl (replace with Ali's user ID):
```bash
curl -X POST "http://localhost:3000/api/admin/subscriptions/reset?userId=ali_user_id_here" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"
```

#### Option 2: Using Browser Console:
```javascript
// Log in as super_admin first, then run this:
const userId = "ali_user_id_here"; // Replace with actual ID

fetch(`/api/admin/subscriptions/reset?userId=${userId}`, {
  method: 'POST',
})
.then(r => r.json())
.then(data => console.log('Reset complete:', data))
.catch(e => console.error('Error:', e))
```

#### Option 3: Create an Admin UI Page:
You could add a button in `/app/admin/subscriptions/page.tsx` to directly reset subscriptions.

---

## What Gets Reset:
✅ Clears `user.adsFreeUntil` (subscription expires)
✅ Deletes ALL subscription requests for the user
✅ User can now see "GO AD'S FREE NOW!" button again
✅ User can create a new subscription request

---

## Testing Flow After Reset:

1. ✅ Admin resets Ali's subscription
2. ✅ Ali refreshes the page → sees "GO AD'S FREE NOW!" button
3. ✅ Ali clicks button → goes to /buy-subscription
4. ✅ Ali submits new subscription request
5. ✅ Admin approves in /admin/subscriptions
6. ✅ Ali refreshes or switches tabs → Cancel button appears automatically
7. ✅ Ali clicks Cancel → Subscription cancelled instantly
8. ✅ Ali sees "GO AD'S FREE NOW!" button again

---

## How to Find User ID:

### From Database:
```sql
SELECT id, email, name FROM "User" WHERE email = 'ali.mahesar04@gmail.com';
```

### From Admin Panel:
1. Go to `/admin/users` (if available)
2. Search for Ali's email
3. Click profile to see user ID

### From Browser Developer Tools:
1. Log in as Ali
2. Open DevTools → Network tab
3. Look for any API response containing `userId` or `id`

---

## Important Notes:

⚠️ This endpoint is **SUPER_ADMIN ONLY** for security
⚠️ All subscription history for the user will be deleted
⚠️ The user will see ads again immediately
✅ The user can always re-subscribe

---

## Verification Commands:

After reset, you can verify:
```bash
# Check that user's adsFreeUntil is null
curl http://localhost:3000/api/subscription/status \
  -H "Cookie: YOUR_AUTH_TOKEN"

# Should return: { isSubscribed: false, adsFreeUntil: null }
```
