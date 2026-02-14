import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendContactAdminEmail, sendContactConfirmationEmail } from '@/lib/email'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        const { name, email, subject, message } = await req.json()

        if (!name || !email || !subject || !message) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
        }

        await prisma.contactMessage.create({
            data: {
                name,
                email,
                subject,
                message,
            },
        })

        try {
            await sendContactAdminEmail({ name, email, subject, message })
            await sendContactConfirmationEmail({ name, email, subject, message })
        } catch (emailError) {
            console.error('Contact email error:', emailError)
            return NextResponse.json({ error: 'Message saved but failed to send email' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Message sent successfully' }, { status: 201 })
    } catch (error: any) {
        console.error('Contact API error:', error)
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }
}

