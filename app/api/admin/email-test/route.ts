import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const decoded = verifyAuth(request)
    
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, subject = 'Test Email from Preptio' } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    }

    // Log environment variables (without exposing sensitive values)
    const envConfig = {
      SMTP_HOST: process.env.SMTP_HOST ? 'configured' : 'missing',
      SMTP_PORT: process.env.SMTP_PORT ? 'configured' : 'missing',
      SMTP_USER: process.env.SMTP_USER ? 'configured' : 'missing',
      SMTP_PASSWORD: process.env.SMTP_PASSWORD ? 'configured' : 'missing',
      SMTP_PASS: process.env.SMTP_PASS ? 'configured' : 'missing',
      SMTP_FROM: process.env.SMTP_FROM ? 'configured' : 'missing',
      SMTP_SECURE: process.env.SMTP_SECURE ? 'configured' : 'missing',
    }

    console.log('[Email Test] Environment Configuration:', envConfig)

    // Try with SMTP_PASSWORD
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS, // Try both versions
      },
    })

    // Verify transporter connection
    try {
      await transporter.verify()
      console.log('[Email Test] SMTP connection verified successfully')
    } catch (verifyError) {
      console.error('[Email Test] SMTP connection verification failed:', verifyError)
      return NextResponse.json(
        {
          error: 'Email configuration error',
          details: 'Cannot connect to SMTP server',
          smtpConfig: envConfig,
          verifyError: String(verifyError),
        },
        { status: 500 }
      )
    }

    // Send test email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">📧 Test Email</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
          <p>This is a test email from Preptio's email system.</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Status:</strong> If you received this, the email system is working correctly!</p>
        </div>
      </div>
    `

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@preptio.com',
      to: email,
      subject: subject,
      html: htmlContent,
      text: 'Test email from Preptio',
    }

    console.log('[Email Test] Sending test email to:', email)
    console.log('[Email Test] Mail options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    })

    const info = await transporter.sendMail(mailOptions)

    console.log('[Email Test] Test email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Test email sent successfully',
        messageId: info.messageId,
        emailConfig: envConfig,
        sentTo: email,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Email Test] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
