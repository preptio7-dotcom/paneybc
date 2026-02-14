'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Send, User, MessageSquare } from 'lucide-react'

const contactSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    subject: z.string().min(5, 'Subject must be at least 5 characters'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
})

type ContactFormData = z.infer<typeof contactSchema>

export function ContactForm() {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
    })

    const onSubmit = async (data: ContactFormData) => {
        setIsSubmitting(true)
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (response.ok) {
                toast.success('Message sent!', {
                    description: 'Thank you for reaching out. We will get back to you soon.',
                })
                reset()
            } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to send message')
            }
        } catch (error: any) {
            toast.error('Submission failed', {
                description: error.message || 'Something went wrong. Please try again.',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Get in Touch</h2>
                <p className="text-gray-500">Have questions about CA? We're here to help.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                            <User size={16} className="text-primary-green" />
                            Full Name
                        </Label>
                        <Input
                            id="name"
                            placeholder="Your Name"
                            {...register('name')}
                            className={errors.name ? 'border-red-500 bg-red-50/10' : ''}
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                            <Mail size={16} className="text-primary-green" />
                            Email Address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            {...register('email')}
                            className={errors.email ? 'border-red-500 bg-red-50/10' : ''}
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="subject" className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare size={16} className="text-primary-green" />
                        Subject
                    </Label>
                    <Input
                        id="subject"
                        placeholder="How can we help you?"
                        {...register('subject')}
                        className={errors.subject ? 'border-red-500 bg-red-50/10' : ''}
                    />
                    {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="message" className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare size={16} className="text-primary-green" />
                        Message
                    </Label>
                    <Textarea
                        id="message"
                        placeholder="Tell us more about your inquiry..."
                        rows={5}
                        {...register('message')}
                        className={errors.message ? 'border-red-500 bg-red-50/10' : ''}
                    />
                    {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>}
                </div>

                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 text-lg font-semibold bg-primary-green hover:bg-primary-green/90 transition-all duration-300 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <span className="animate-pulse">Sending...</span>
                    ) : (
                        <>
                            Send Message
                            <Send size={18} />
                        </>
                    )}
                </Button>
            </form>
        </div>
    )
}
