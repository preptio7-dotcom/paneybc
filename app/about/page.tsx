'use client'

import React from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldCheck, Target, Users, BookMarked, Linkedin, Twitter, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AboutPage() {
    const router = useRouter()
    const values = [
        {
            icon: <Target className="text-primary-green" />,
            title: 'Precision Prep',
            description: 'We focus on high-yield questions that actually appear in CA examinations.'
        },
        {
            icon: <Users className="text-primary-green" />,
            title: 'Student First',
            description: 'Built by students, for students. We understand the pressure of professional exams.'
        },
        {
            icon: <ShieldCheck className="text-primary-green" />,
            title: 'Reliable Data',
            description: 'Our questions are verified by professionals to ensure accuracy and relevance.'
        }
    ]

    return (
        <main className="min-h-screen bg-white">
            <Navigation />

            <div className="pt-20 md:pt-28 pb-16 md:pb-24">
                {/* Hero Section */}
                <div className="max-w-7xl mx-auto px-6 mb-16 md:mb-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
                        <div className="space-y-6 md:space-y-8 text-center lg:text-left">
                            <div className="inline-block bg-primary-green/10 text-primary-green px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                                Our Mission
                            </div>
                            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-black text-text-dark leading-[1.1]">
                                Empowering the Next Generation of <span className="text-primary-green">Chartered Accountants</span>
                            </h1>
                            <p className="text-text-light text-lg md:text-xl leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                Preptio was founded with a simple goal: to make professional exam preparation accessible, efficient, and data-driven. We provide the tools you need to master your curriculum.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Link href="/auth/signup" className="w-full sm:w-auto">
                                    <Button className="w-full sm:w-auto bg-primary-green hover:bg-primary-green/90 h-14 px-8 text-lg font-bold">
                                        Start Your Journey
                                    </Button>
                                </Link>
                                <Link href="/subjects" className="w-full sm:w-auto">
                                    <Button variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg font-bold">
                                        Explore Subjects
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        <div className="relative mt-8 lg:mt-0">
                            <div className="aspect-square bg-slate-50 rounded-[32px] md:rounded-[40px] flex items-center justify-center overflow-hidden shadow-2xl">
                                <BookMarked size={120} className="text-primary-green/20 md:w-[200px] md:h-[200px]" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="grid grid-cols-2 gap-3 md:gap-4 px-4">
                                        <div className="p-4 md:p-8 bg-white rounded-2xl md:rounded-3xl shadow-xl space-y-1 md:space-y-2">
                                            <p className="text-2xl md:text-4xl font-black text-text-dark">15k+</p>
                                            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">Success Stories</p>
                                        </div>
                                        <div className="p-4 md:p-8 bg-white rounded-2xl md:rounded-3xl shadow-xl space-y-1 md:space-y-2 translate-y-4 md:translate-y-8">
                                            <p className="text-2xl md:text-4xl font-black text-primary-green">95%</p>
                                            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">Pass Rate</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Our Values */}
                <div className="bg-slate-50 py-16 md:py-24">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-12 md:mb-16 space-y-4">
                            <h2 className="font-heading text-3xl font-black text-text-dark">What We Believe In</h2>
                            <p className="text-text-light max-w-xl mx-auto">Our core values drive every feature we build and every question we curate.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                            {values.map((v, i) => (
                                <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-8 md:p-10 text-center space-y-4">
                                        <div className="w-16 h-16 bg-white shadow-inner rounded-2xl flex items-center justify-center mx-auto mb-4 scale-110 text-primary-green">
                                            {React.isValidElement(v.icon) && React.cloneElement(v.icon as React.ReactElement<any>, { size: 32 })}
                                        </div>
                                        <h4 className="text-xl font-bold text-text-dark">{v.title}</h4>
                                        <p className="text-sm text-text-light leading-relaxed">{v.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Contact Banner */}
                <div className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 text-center">
                    <div className="bg-slate-900 rounded-[32px] md:rounded-[40px] p-8 md:p-16 text-white overflow-hidden relative">
                        <div className="relative z-10 space-y-6">
                            <h2 className="font-heading text-3xl md:text-4xl font-black">Got Questions? We're Here to Help.</h2>
                            <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto">
                                Whether you're a student seeking guidance or an institution looking for bulk access, our team is ready to support you.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-6">
                                <Button className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 font-bold h-12 px-8 flex items-center justify-center gap-2 " onClick={() => router.push('/contact')}>
                                    <Mail size={18} />
                                    Contact Support
                                </Button>
                                <div className="flex items-center gap-4">
                                    <Link href="#" className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                        <Twitter size={20} />
                                    </Link>
                                    <Link href="#" className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                        <Linkedin size={20} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-green/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    )
}
