export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

export async function POST(req: Request) {
    try {
        // 1. Verify super admin session
        const cookieStore = await cookies()
        const superAdminToken = cookieStore.get('super_admin_session')?.value
        if (!superAdminToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { messageId, replyText } = await req.json()

        if (!messageId || !replyText) {
            return NextResponse.json({ error: 'Message ID and reply text are required' }, { status: 400 })
        }

        // 2. Find the original message
        const message = await prisma.contactMessage.findUnique({ where: { id: messageId } })
        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 })
        }

        // 3. Send email to user
        const mailOptions = {
            from: `"Preptio Support" <${process.env.SMTP_USER}>`,
            to: message.email,
            subject: `Re: ${message.subject}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; color: #1e293b;">
                    <h2 style="color: #16a34a; margin-top: 0;">Support Reply</h2>
                    <p>Hello ${message.name},</p>
                    <p>Thank you for reaching out to us. Here is our response to your inquiry regarding "<strong>${message.subject}</strong>":</p>
                    
                    <div style="background: #f8fafc; border-left: 4px solid #16a34a; border-radius: 4px; padding: 20px; margin: 24px 0; font-style: italic; color: #334155;">
                        ${replyText.replace(/\n/g, '<br>')}
                    </div>
                    
                    <p style="font-size: 14px; color: #64748b;">If you have further questions, feel free to reply to this email.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
                    
                    <div style="font-size: 12px; color: #94a3b8;">
                        <p><strong>Original Message:</strong></p>
                        <p>${message.message}</p>
                    </div>
                    
                    <p style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 32px;">Preptio &copy; ${new Date().getFullYear()}</p>
                </div>
            `,
        }

        await transporter.sendMail(mailOptions)

        // 4. Update database record
        await prisma.contactMessage.update({
            where: { id: messageId },
            data: {
                status: 'replied',
                reply: replyText,
                replyAt: new Date(),
            },
        })

        return NextResponse.json({ success: true, message: 'Reply sent successfully' })
    } catch (error: any) {
        console.error('Reply API Error:', error)
        return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 })
    }
}

