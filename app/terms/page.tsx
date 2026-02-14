'use client'

import React from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-background-light">
            <Navigation />

            <div className="pt-28 pb-20">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-border">
                        <h1 className="font-heading text-4xl font-black text-text-dark mb-8">Terms of Service</h1>

                        <div className="prose prose-slate max-w-none space-y-6 text-text-light leading-relaxed">
                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">1. Agreement to Terms</h2>
                                <p>
                                    These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity (“you”) and Preptio (“we,” “us” or “our”), concerning your access to and use of our website.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">2. Intellectual Property Rights</h2>
                                <p>
                                    Unless otherwise indicated, the Website is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Website (collectively, the “Content”) are owned or controlled by us or licensed to us.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">3. User Representations</h2>
                                <p>
                                    By using the Website, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">4. User Registration</h2>
                                <p>
                                    You may be required to register with the Website. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">5. Prohibited Activities</h2>
                                <p>
                                    You may not access or use the Website for any purpose other than that for which we make the Website available. The Website may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">6. Termination</h2>
                                <p>
                                    These Terms of Service shall remain in full force and effect while you use the Website. WITHOUT LIMITING ANY OTHER PROVISION OF THESE TERMS OF SERVICE, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE WEBSITE TO ANY PERSON FOR ANY REASON.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">7. Governing Law</h2>
                                <p>
                                    These Terms of Service and your use of the Website are governed by and construed in accordance with the laws of Pakistan applicable to agreements made and to be entirely performed within Pakistan, without regard to its conflict of law principles.
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    )
}
