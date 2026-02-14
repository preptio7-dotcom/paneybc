'use client'

import React, { useState } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

const contactSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    subject: z.string().min(5, 'Subject must be at least 5 characters'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
})

type ContactFormData = z.infer<typeof contactSchema>

export function ContactPopup() {
    const [isOpen, setIsOpen] = useState(false)
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
                toast.success('Message Sent!', {
                    description: "We've received your message and will get back to you soon.",
                })
                reset()
                setIsOpen(false)
            } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to send message')
            }
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    className="fixed bottom-6 right-6 w-14 h-14 bg-primary-green text-gray-950 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border-4 border-white dark:border-gray-900"
                    aria-label="Contact Support"
                >
                    <MessageCircle className="group-hover:rotate-12 transition-transform" size={28} />
                    <span className="absolute right-full mr-4 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-gray-800">
                        Need help? Contact us!
                    </span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl p-6 overflow-hidden">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary-green/10 rounded-xl flex items-center justify-center text-primary-green">
                            <MessageCircle size={24} />
                        </div>
                        Contact Support
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                        Have a question or feedback? Send us a message and we'll reply to your email.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="popup-name" className="text-sm font-semibold text-gray-700">Name</Label>
                            <Input
                                id="popup-name"
                                placeholder="John Doe"
                                {...register('name')}
                                className="bg-gray-50 border-gray-200 focus:ring-primary-green"
                            />
                            {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="popup-email" className="text-sm font-semibold text-gray-700">Email</Label>
                            <Input
                                id="popup-email"
                                type="email"
                                placeholder="john@example.com"
                                {...register('email')}
                                className="bg-gray-50 border-gray-200 focus:ring-primary-green"
                            />
                            {errors.email && <p className="text-[10px] text-red-500">{errors.email.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="popup-subject" className="text-sm font-semibold text-gray-700">Subject</Label>
                        <Input
                            id="popup-subject"
                            placeholder="How can we help?"
                            {...register('subject')}
                            className="bg-gray-50 border-gray-200 focus:ring-primary-green"
                        />
                        {errors.subject && <p className="text-[10px] text-red-500">{errors.subject.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="popup-message" className="text-sm font-semibold text-gray-700">Message</Label>
                        <Textarea
                            id="popup-message"
                            placeholder="Type your message here..."
                            {...register('message')}
                            className="bg-gray-50 border-gray-200 focus:ring-primary-green min-h-[100px] resize-none"
                        />
                        {errors.message && <p className="text-[10px] text-red-500">{errors.message.message}</p>}
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 bg-primary-green hover:bg-primary-green/90 text-gray-950 font-bold rounded-xl flex items-center justify-center gap-2 mt-2 transition-all active:scale-[0.98]"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <Send size={18} />
                                Send Message
                            </>
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
