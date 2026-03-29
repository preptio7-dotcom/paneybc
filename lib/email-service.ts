import nodemailer from 'nodemailer'

// Create transporter - using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendSubscriptionApprovedEmail(
  userEmail: string,
  userName: string,
  plan: 'one_month' | 'lifetime'
) {
  const planLabel = plan === 'one_month' ? '1 Month (PKR 200)' : 'Lifetime (PKR 1,200)'
  const planDuration = plan === 'one_month' ? '30 days' : 'Lifetime'

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🎉 Subscription Approved!</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Hi <strong>${userName}</strong>,
        </p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          Great news! Your subscription has been approved by our admin team.
        </p>

        <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; color: #888; font-size: 13px; text-transform: uppercase;">Subscription Details</p>
          <h3 style="margin: 10px 0; color: #333; font-size: 18px;">
            ${planLabel}
          </h3>
          <p style="margin: 10px 0; color: #666; font-size: 14px;">
            <strong>Duration:</strong> ${planDuration}
          </p>
          <p style="margin: 10px 0; color: #666; font-size: 14px;">
            <strong>Status:</strong> <span style="color: #22c55e; font-weight: bold;">● Active</span>
          </p>
        </div>

        <p style="font-size: 14px; color: #555; line-height: 1.6; margin-top: 20px;">
          <strong>✓ Ads have been disabled on your account</strong><br/>
          You can now enjoy Preptio without advertisements. Just refresh your page or log out and log back in to see the changes take effect.
        </p>

        <div style="background: #f0f7ff; border: 1px solid #0284c7; border-radius: 4px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #0284c7; font-size: 13px;">
            <strong>💡 Tip:</strong> Log out and log back in to immediately apply the ad-free experience across all pages.
          </p>
        </div>

        <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 20px;">
          If you have any questions or need support, feel free to contact us.
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
          <p style="font-size: 12px; color: #999; margin: 0;">
            © 2026 Preptio. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `

  const textContent = `
Subscription Approved!

Hi ${userName},

Great news! Your subscription has been approved by our admin team.

Subscription Details:
Plan: ${planLabel}
Duration: ${planDuration}
Status: Active

Ads have been disabled on your account. You can now enjoy Preptio without advertisements. 
Just refresh your page or log out and log back in to see the changes take effect.

If you have any questions or need support, feel free to contact us.

© 2026 Preptio. All rights reserved.
  `

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@preptio.com',
      to: userEmail,
      subject: '🎉 Your Subscription Has Been Approved!',
      text: textContent,
      html: htmlContent,
    }

    console.log('[Email] Attempting to send approval email to:', userEmail)
    await transporter.sendMail(mailOptions)
    console.log('[Email] Approval email sent successfully to:', userEmail)
    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send subscription approval email:', {
      email: userEmail,
      error: String(error),
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    // Don't throw - email failure shouldn't fail the subscription approval
    return { success: false, error: String(error) }
  }
}

export async function sendSubscriptionRejectedEmail(
  userEmail: string,
  userName: string,
  plan: 'one_month' | 'lifetime',
  rejectionReason: string
) {
  const planLabel = plan === 'one_month' ? '1 Month (PKR 200)' : 'Lifetime (PKR 1,200)'

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Subscription Request Update</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Hi <strong>${userName}</strong>,
        </p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          We've reviewed your subscription request for <strong>${planLabel}</strong>, and unfortunately it was not approved at this time.
        </p>

        <div style="background: white; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; color: #888; font-size: 13px; text-transform: uppercase;">Reason for Rejection</p>
          <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6;">
            ${rejectionReason}
          </p>
        </div>

        <p style="font-size: 14px; color: #555; line-height: 1.6; margin-top: 20px;">
          If you have questions about this decision or would like to resubmit your request with corrections, please don't hesitate to reach out.
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
          <p style="font-size: 12px; color: #999; margin: 0;">
            © 2026 Preptio. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `

  const textContent = `
Subscription Request Update

Hi ${userName},

We've reviewed your subscription request for ${planLabel}, and unfortunately it was not approved at this time.

Reason for Rejection:
${rejectionReason}

If you have questions about this decision or would like to resubmit your request with corrections, please don't hesitate to reach out.

© 2026 Preptio. All rights reserved.
  `

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@preptio.com',
      to: userEmail,
      subject: 'Update on Your Subscription Request',
      text: textContent,
      html: htmlContent,
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to send subscription rejection email:', error)
    return { success: false, error: String(error) }
  }
}
