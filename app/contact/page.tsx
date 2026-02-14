import React from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { ContactForm } from '@/components/contact-form'

export default function ContactPage() {
    return (
        <main className="w-full min-h-screen bg-gray-50 flex flex-col">
            <Navigation />
            <div className="flex-grow pt-[120px] pb-20 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Left Side: Info */}
                    <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                                We'd love to hear <br />
                                <span className="text-primary-green">from you.</span>
                            </h1>
                            <p className="text-lg text-gray-600 max-w-md">
                                Whether you have a question about features or anything else, our team is ready to answer all your questions.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary-green/10 flex items-center justify-center">
                                    <span className="text-xl">📍</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Our Office</h3>
                                    <p className="text-gray-500">Karachi, Pakistan</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-secondary-gold/10 flex items-center justify-center">
                                    <span className="text-xl">📧</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Email Us</h3>
                                    <p className="text-gray-500">preptio7@gmail.com</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-xl">📞</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Call Us</h3>
                                    <p className="text-gray-500">+92 (323) 951-3175</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Form */}
                    <div className="animate-in fade-in slide-in-from-right duration-700">
                        <ContactForm />
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    )
}
