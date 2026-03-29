# Subscription Approval & Ads Removal Guide

## 🐛 Bug Fixed: View Proof Button
**Issue:** Clicking "View Proof" was opening the reject dialog instead of showing the payment proof.
**Solution:** Separated dialog management with dedicated state variables (`showPreview` and `showRejectDialog`).
**Result:** View Proof now correctly displays the payment proof image/PDF in a preview dialog.

---

## 📧 User Notifications After Approval

### Email Notification ✅
When you **approve** a subscription request, the user receives an **automated email** with:
- ✓ Confirmation that their subscription was approved
- ✓ Subscription plan details (1 Month or Lifetime)
- ✓ Notification that ads are now disabled
- ✓ Instructions to refresh or log out/in to see changes

### When Does User See It?
- **Timing:** Email is sent **immediately** after you click "Approve"
- **Delivery:** Usually arrives within seconds (depends on email server)
- **Backup:** User can also check the application status after page refresh

### In-App Notification ✓
Before the user sees the ads disappear, they can:
1. **Refresh the page** - User data is re-fetched, ads disappear
2. **Log out and log back in** - Session refreshes, ads disappear
3. **Wait for next page load** - When user navigates to another page, data updates

---

## ⏰ Ads Removal Timeline

### How It Works:
1. **Approval Triggered:** Admin clicks "Approve" button
2. **Database Updated:** User's `adsFreeUntil` field is set to:
   - **1 Month Plan:** Current date + 30 days
   - **Lifetime Plan:** December 31, 2099
3. **Ads Disappear:** System checks if `adsFreeUntil > current date`

### Timeline for User:

| When | What Happens | User Sees |
|------|-------------|-----------|
| **You click "Approve"** | Database updated, email sent | Nothing yet (user not on page) |
| **User refreshes page** | System checks adsFreeUntil, loads new user data | **Ads disappear instantly** ✓ |
| **User logs out/in** | New session loads fresh user data | **Ads disappear instantly** ✓ |
| **Next page navigation** | Data refreshed on new route | **Ads disappear** ✓ |
| **Opens email** | User reads approval message | Knows approval happened |

### Does Ads Removal Take Time?
**NO** - It's instant once the user's data is refreshed. The ads don't "fade out" or have a delay. They simply disappear when the system checks the `adsFreeUntil` field.

---

## 👥 Both Approval AND Rejection Send Emails

### Approval Email Includes:
- Plan details and duration
- Status: Active (in green)
- Instructions to refresh for ads removal
- Professional design with branding

### Rejection Email Includes:
- Rejection reason (exactly what you typed)
- Plan details
- Option to resubmit
- Professional design

Both emails are sent automatically and can't be prevented (unless SMTP is misconfigured).

---

## 🔧 Email Configuration Required

For emails to work, you need these environment variables in `.env.local`:

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@preptio.com
```

### For Gmail Users:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=your-email@gmail.com
```

[Get Gmail App Password](https://myaccount.google.com/apppasswords)

---

## 📋 Subscription States & What They Mean

| Status | What It Is | User Sees Ads? | Next Action |
|--------|-----------|---|---|
| **Pending** | Submitted, waiting for approval | Yes | Admin clicks Approve/Reject |
| **Approved** | Verified and activated | **No** ✓| User gets email |
| **Rejected** | Not approved, reason given | Yes | User can try again |

---

## 🎯 Full Workflow Summary

```
User Submits Request
    ↓
Admin Reviews Payment Proof (Click "View Proof")
    ↓
Admin Clicks "Approve" or "Reject"
    ↓
Database Updated + Email Sent to User
    ↓
If APPROVED:
  - User gets email confirming approval
  - Ads flag is set in database
  - User refreshes page → Ads disappear

If REJECTED:
  - User gets email with rejection reason
  - Can resubmit with corrections
  - Ads still showing
```

---

## 🚀 Recent Improvements

1. ✅ **View Proof Button Fixed** - Now opens preview instead of reject dialog
2. ✅ **Email Notifications Added** - Users notified of approval/rejection
3. ✅ **Instant Ads Removal** - Once user data refreshes, ads instantly disappear
4. ✅ **Database Storage** - Payment proofs stored as base64 in database (Vercel compatible)
5. ✅ **Professional Templates** - Formatted HTML emails with branding

---

## 💡 Pro Tips for Admins

1. **View the payment proof before approving** - Use "View Proof" button to verify authenticity
2. **Write clear rejection reasons** - Users see the exact reason you type in the email
3. **Approval is instant** - Database updates happen immediately after click
4. **User sees ads removal on refresh** - They don't need to wait or log out unless they want
5. **Check email logs** - Failures don't prevent approval, but are logged in server console

