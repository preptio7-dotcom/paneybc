'use client'

import React from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-background-light">
            <Navigation />

            <div className="pt-28 pb-20">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-border">
                        <h1 className="font-heading text-4xl font-black text-text-dark mb-8">Privacy Policy</h1>

                        <div className="prose prose-slate max-w-none space-y-6 text-text-light leading-relaxed">
                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">1. Introduction</h2>
                                <p>
                                    Welcome to Preptio. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us at support@preptio.com.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">2. Information We Collect</h2>
                                <p>
                                    We collect personal information that you voluntarily provide to us when you register on the Website, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Website or otherwise when you contact us.
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li><strong>Personal Data:</strong> Name, email address, password, and avatar selection.</li>
                                    <li><strong>Performance Data:</strong> Quiz results, practice history, and progress tracking.</li>
                                    <li><strong>Communication Data:</strong> Messages sent via our contact forms.</li>
                                    <li><strong>Subscription Data:</strong> Subscription plan details, purchase history, and payment proof documentation uploaded for verification.</li>
                                    <li><strong>Payment Information:</strong> Payment method type (Nayapay, Easypaisa, Bank Transfer) and transaction details necessary for subscription processing.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">3. How We Use Your Information</h2>
                                <p>
                                    We use personal information collected via our Website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>To facilitate account creation and logon process.</li>
                                    <li>To send you administrative information.</li>
                                    <li>To provide you with the Services and track your progress.</li>
                                    <li>To respond to user inquiries and offer support.</li>
                                    <li>To process subscription requests and manage your subscription status (Monthly or Lifetime plans).</li>
                                    <li>To verify payment proof and approve/reject subscription requests.</li>
                                    <li>To communicate subscription status updates, approvals, and rejections via email.</li>
                                    <li>To enable ad-free experience for subscribed users.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">4. Data Security</h2>
                                <p>
                                    We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">5. Payment & Subscription Processing</h2>
                                <p>
                                    When you subscribe to Preptio's premium plans (Monthly or Lifetime), we collect payment proof to verify your payment. This information is used solely for subscription verification and approval purposes.
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li><strong>Payment Proof Storage:</strong> Payment proofs are uploaded to our secure cloud storage (Cloudflare R2) and accessible only to authorized administrators for verification.</li>
                                    <li><strong>Subscription Status:</strong> Your subscription status (pending, approved, rejected, or cancelled) is tracked in our system to manage ad-free access and feature availability.</li>
                                    <li><strong>Payment Methods:</strong> We support Nayapay, Easypaisa, and Bank Transfer. We do not store payment card information directly; payment proofs serve as verification.</li>
                                    <li><strong>Admin Review:</strong> Our admin team manually verifies payment proofs and notifies you of approval or rejection via email.</li>
                                    <li><strong>Subscription Cancellation:</strong> You may cancel your subscription anytime. Once cancelled, ad-free access will be disabled and normal operation resumes.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">6. Your Privacy Rights</h2>
                                <p>
                                    In some regions, you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-text-dark mb-4">7. Updates to This Policy</h2>
                                <p>
                                    We may update this privacy notice from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible.
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
