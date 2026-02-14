import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendOTPEmail(email: string, code: string) {
  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Super Admin Login - Verification Code',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">Verification Code</h2>
        <p>To finalize your Super Admin login, please enter the following verification code:</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.2em; color: #0f172a;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #64748b;">This code is valid for 10 minutes. If you did not request this login, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export async function sendAdminOTPEmail(email: string, code: string) {
  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Admin Login - Verification Code',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">Verification Code</h2>
        <p>To finalize your Admin login, please enter the following verification code:</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.2em; color: #0f172a;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #64748b;">This code is valid for 10 minutes. If you did not request this login, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password/${token}`

  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your Password - Preptio',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">Password Reset</h2>
        <p>You requested a password reset for your Preptio account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #64748b; font-size: 14px;">${resetUrl}</p>
        <p style="font-size: 14px; color: #64748b;">This link is valid for 1 hour. If you did not request a password reset, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export async function sendSignupVerificationEmail(email: string, code: string) {
  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify Your Email - Preptio',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">Email Verification</h2>
        <p>Thanks for signing up! Use the code below to verify your email address:</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.2em; color: #0f172a;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #64748b;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export async function sendAccountDeletionOTPEmail(email: string, code: string) {
  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Account Deletion - Verification Code',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #dc2626; margin-top: 0;">Confirm Account Deletion</h2>
        <p>We received a request to permanently delete your Preptio account. Enter the code below to continue:</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.2em; color: #0f172a;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #64748b;">This code is valid for 10 minutes. If you did not request this, please secure your account.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export async function sendReviewDueEmail(email: string, name: string, count: number) {
  const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/review`

  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Review Due - Preptio',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">Your Review Queue is Ready</h2>
        <p>Hi ${name || 'there'},</p>
        <p>You have <strong>${count}</strong> questions due for spaced repetition today.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${reviewUrl}" style="background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Start Review</a>
        </div>
        <p style="font-size: 14px; color: #64748b;">Consistent review helps you retain concepts and perform better on exam day.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export async function sendCampaignEmail(email: string, subject: string, body: string) {
  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        ${body}
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export async function sendQuestionReportReceivedEmail(email: string, details: { subject?: string; questionNumber?: number; questionText?: string }) {
  const subjectLine = details.subject ? `Subject: ${details.subject}` : 'Subject: N/A'
  const questionLine = typeof details.questionNumber === 'number' ? `Question #${details.questionNumber}` : 'Question: N/A'
  const questionText = details.questionText ? details.questionText : 'Question text not available.'

  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'We received your question report',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">Thanks for your report</h2>
        <p>We have received your report and will review it shortly. We will notify you after checking.</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #475569;"><strong>${subjectLine}</strong></p>
          <p style="margin: 6px 0 0; font-size: 14px; color: #475569;">${questionLine}</p>
          <p style="margin: 10px 0 0; font-size: 14px; color: #475569;">${questionText}</p>
        </div>
        <p style="font-size: 14px; color: #64748b;">If you have more details, you can reply to this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export async function sendQuestionReportReplyEmail(email: string, message: string, details?: { subject?: string; questionNumber?: number; questionText?: string }) {
  const subjectLine = details?.subject ? `Subject: ${details.subject}` : 'Subject: N/A'
  const questionLine = typeof details?.questionNumber === 'number' ? `Question #${details.questionNumber}` : 'Question: N/A'
  const questionText = details?.questionText ? details.questionText : 'Question text not available.'

  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Update on your question report',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">Report update</h2>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px; color: #475569;"><strong>${subjectLine}</strong></p>
          <p style="margin: 6px 0 0; font-size: 14px; color: #475569;">${questionLine}</p>
          <p style="margin: 10px 0 0; font-size: 14px; color: #475569;">${questionText}</p>
        </div>
        <p>Thanks for helping us improve. Here is an update from our team:</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0; color: #475569;">
          ${message}
        </div>
        <p style="font-size: 14px; color: #64748b;">If you have more details, you can reply to this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export async function sendQuestionReportAdminEmail(
  recipients: string[],
  payload: {
    reporterEmail: string
    reason: string
    subject?: string
    questionNumber?: number
    questionText?: string
  }
) {
  if (!recipients.length) return null

  const subjectLine = payload.subject ? `Subject: ${payload.subject}` : 'Subject: N/A'
  const questionLine = typeof payload.questionNumber === 'number' ? `Question #${payload.questionNumber}` : 'Question: N/A'
  const questionText = payload.questionText ? payload.questionText : 'Question text not available.'

  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: recipients.join(','),
    subject: 'New Question Report Submitted',
    html: `
      <div style="font-family: sans-serif; max-width: 650px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">New Question Report</h2>
        <p><strong>Reporter:</strong> ${payload.reporterEmail || 'Unknown'}</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px; color: #475569;"><strong>${subjectLine}</strong></p>
          <p style="margin: 6px 0 0; font-size: 14px; color: #475569;">${questionLine}</p>
          <p style="margin: 10px 0 0; font-size: 14px; color: #475569;">${questionText}</p>
        </div>
        <p><strong>Report Reason:</strong></p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; color: #475569; white-space: pre-wrap;">
          ${payload.reason}
        </div>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export async function sendFinancialStatementReportReceivedEmail(
  email: string,
  details: { caseNumber?: string; caseTitle?: string; section?: string; heading?: string }
) {
  const caseLine = details.caseNumber ? `Case: ${details.caseNumber}` : 'Case: N/A'
  const titleLine = details.caseTitle ? details.caseTitle : 'Financial Statement Case'
  const itemLine = details.heading ? `${details.section || 'Section'} - ${details.heading}` : details.section || 'Line item'

  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'We received your financial statement report',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">Thanks for your report</h2>
        <p>We have received your report and will review it shortly. We will notify you after checking.</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #475569;"><strong>${caseLine}</strong></p>
          <p style="margin: 6px 0 0; font-size: 14px; color: #475569;">${titleLine}</p>
          <p style="margin: 10px 0 0; font-size: 14px; color: #475569;">${itemLine}</p>
        </div>
        <p style="font-size: 14px; color: #64748b;">If you have more details, you can reply to this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export async function sendFinancialStatementReportAdminEmail(
  recipients: string[],
  payload: {
    reporterEmail: string
    reason: string
    caseNumber?: string
    caseTitle?: string
    section?: string
    heading?: string
  }
) {
  if (!recipients.length) return null

  const caseLine = payload.caseNumber ? `Case: ${payload.caseNumber}` : 'Case: N/A'
  const titleLine = payload.caseTitle || 'Financial Statement Case'
  const itemLine = payload.heading ? `${payload.section || 'Section'} - ${payload.heading}` : payload.section || 'Line item'

  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: recipients.join(','),
    subject: 'New Financial Statement Report Submitted',
    html: `
      <div style="font-family: sans-serif; max-width: 650px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">New Financial Statement Report</h2>
        <p><strong>Reporter:</strong> ${payload.reporterEmail || 'Unknown'}</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px; color: #475569;"><strong>${caseLine}</strong></p>
          <p style="margin: 6px 0 0; font-size: 14px; color: #475569;">${titleLine}</p>
          <p style="margin: 10px 0 0; font-size: 14px; color: #475569;">${itemLine}</p>
        </div>
        <p><strong>Report Reason:</strong></p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; color: #475569; white-space: pre-wrap;">
          ${payload.reason}
        </div>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export async function sendJoinUsThankYouEmail(email: string, name: string, type: string) {
  const typeLabel = type === 'ambassador' ? 'Brand Ambassador' : type === 'reviews' ? 'Review & Feedback' : 'MCQ Data'
  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Thank you for joining Preptio (${typeLabel})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">Thank you, ${name || 'there'}!</h2>
        <p>We appreciate your interest in helping Preptio grow.</p>
        <p>Our team will review your submission and reach out soon.</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0; color: #475569;">
          <strong>Category:</strong> ${typeLabel}
        </div>
        <p style="font-size: 14px; color: #64748b;">If you have more details, you can reply to this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }
  return transporter.sendMail(mailOptions)
}

export async function sendJoinUsReplyEmail(email: string, name: string, type: string, message: string) {
  const typeLabel = type === 'ambassador' ? 'Brand Ambassador' : type === 'reviews' ? 'Review & Feedback' : 'MCQ Data'
  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your Preptio request update (${typeLabel})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">Hello ${name || 'there'}</h2>
        <p>Thank you for your interest in Preptio. Here is an update from our team:</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0; color: #475569;">
          ${message}
        </div>
        <p style="font-size: 14px; color: #64748b;">Category: ${typeLabel}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }
  return transporter.sendMail(mailOptions)
}

export async function sendJoinUsAdminEmail(payload: {
  name: string
  email: string
  phone?: string
  institute?: string
  role?: string
  experience?: string
  message?: string
  type: string
}) {
  const typeLabel = payload.type === 'ambassador' ? 'Brand Ambassador' : payload.type === 'reviews' ? 'Review & Feedback' : 'MCQ Data'
  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: `New Join Us submission (${typeLabel})`,
    html: `
      <div style="font-family: sans-serif; max-width: 650px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">New Join Us Submission</h2>
        <p><strong>Category:</strong> ${typeLabel}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;">
        <p><strong>Name:</strong> ${payload.name}</p>
        <p><strong>Email:</strong> ${payload.email}</p>
        <p><strong>Phone:</strong> ${payload.phone || 'N/A'}</p>
        <p><strong>Institute:</strong> ${payload.institute || 'N/A'}</p>
        <p><strong>Role:</strong> ${payload.role || 'N/A'}</p>
        <p><strong>Experience:</strong> ${payload.experience || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; color: #475569;">
          ${payload.message || 'N/A'}
        </div>
      </div>
    `,
  }
  return transporter.sendMail(mailOptions)
}

export async function sendContactConfirmationEmail(payload: {
  name: string
  email: string
  subject: string
  message: string
}) {
  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: payload.email,
    subject: 'We received your message - Preptio',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">Thanks for reaching out, ${payload.name || 'there'}!</h2>
        <p>We received your message and our team will get back to you soon.</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0; color: #475569;">
          <p style="margin: 0; font-size: 14px;"><strong>Subject:</strong> ${payload.subject}</p>
          <p style="margin: 10px 0 0; font-size: 14px; white-space: pre-wrap;">${payload.message}</p>
        </div>
        <p style="font-size: 14px; color: #64748b;">We appreciate your patience.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Preptio &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  }
  return transporter.sendMail(mailOptions)
}

export async function sendContactAdminEmail(payload: {
  name: string
  email: string
  subject: string
  message: string
}) {
  const mailOptions = {
    from: `"Preptio" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: `New Contact Message: ${payload.subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 650px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; color: #1e293b;">
        <h2 style="color: #16a34a; margin-top: 0;">New Contact Message</h2>
        <p><strong>Name:</strong> ${payload.name}</p>
        <p><strong>Email:</strong> ${payload.email}</p>
        <p><strong>Subject:</strong> ${payload.subject}</p>
        <p><strong>Message:</strong></p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; color: #475569; white-space: pre-wrap;">
          ${payload.message}
        </div>
      </div>
    `,
  }
  return transporter.sendMail(mailOptions)
}
