'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'
import { canAccessBetaFeature, extractBetaFeatureSettings } from '@/lib/beta-features'
import {
  Building2,
  GraduationCap,
  Users,
  Bell,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  Sparkles,
  Laptop,
  Check,
  HelpCircle,
} from 'lucide-react'

type ContactFormState = {
  name: string
  email: string
  phone: string
  institute: string
  role: string
  studentCount: string
  subjects: string
  message: string
}

const INITIAL_FORM: ContactFormState = {
  name: '',
  email: '',
  phone: '',
  institute: '',
  role: 'Dean / Department Head',
  studentCount: '15-50',
  subjects: 'PRC & CAF',
  message: '',
}

export default function InstitutionsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [formData, setFormData] = useState<ContactFormState>(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)
  const [isBetaActive, setIsBetaActive] = useState<boolean | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/public/settings?t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          const beta = extractBetaFeatureSettings(data?.testSettings || {})
          const isPermitted =
            user?.role === 'admin' ||
            user?.role === 'super_admin' ||
            canAccessBetaFeature(beta.institutionalEnrollment, user?.studentRole)
          setIsBetaActive(isPermitted)
        }
      } catch {
        setIsBetaActive(true)
      }
    }
    void fetchSettings()
  }, [user])

  const scrollToForm = (tierTitle?: string) => {
    if (tierTitle) {
      setFormData((prev) => ({
        ...prev,
        message: prev.message ? prev.message : `Interested in custom pricing for: ${tierTitle}`,
      }))
    }
    const formElement = document.getElementById('inquiry-form-section')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: 'Required fields missing',
        description: 'Please provide both your name and a valid work email address.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/public/institutions/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit quote inquiry.')
      }

      setSubmittedSuccess(true)
      toast({
        title: 'Inquiry Sent Successfully',
        description:
          'Our team has received your request and will reach out within 24 to 48 hours.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Unable to submit inquiry at this moment.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950 via-slate-950 to-slate-950 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs md:text-sm font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 backdrop-blur-md shadow-sm">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Preptio for Colleges, Academies & Independent Educators</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance max-w-4xl mx-auto leading-tight">
            Empower Your Students with Preptio — Built for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
              Institutions & Faculty
            </span>
          </h1>

          <p className="text-slate-300 text-lg md:text-xl max-w-3xl mx-auto font-normal leading-relaxed">
            Batch-enroll entire cohorts with bulk licensing, monitor real-time class readiness via the
            Faculty Cockpit, and broadcast native Windows push notifications directly to students.
            Open to institutional campuses and independent teachers with 15+ students.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              onClick={() => scrollToForm()}
              size="lg"
              className="w-full sm:w-auto bg-[#0F7938] hover:bg-emerald-700 text-white font-semibold px-8 py-6 rounded-xl shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02]"
            >
              Contact for Pricing
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <a
              href="#service-scope"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl border border-white/15 hover:bg-white/10 text-white font-medium text-sm transition-all"
            >
              Explore Scope of Service
            </a>
          </div>

          {/* Social Proof Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 border-t border-white/10 max-w-4xl mx-auto text-left">
            <div>
              <p className="text-3xl font-bold text-white tracking-tight">100%</p>
              <p className="text-xs md:text-sm text-slate-400 font-medium">ICAP Syllabus Match</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-400 tracking-tight">1-Click</p>
              <p className="text-xs md:text-sm text-slate-400 font-medium">Bulk Roster Activation</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white tracking-tight">15+</p>
              <p className="text-xs md:text-sm text-slate-400 font-medium">Min. Student Batch Size</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-400 tracking-tight">Windows</p>
              <p className="text-xs md:text-sm text-slate-400 font-medium">Desktop Push Notifications</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Pricing / Tier Selection Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-[#0F7938]">
            Flexible Enrollment Plans
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-slate-900">
            Tailored Volume Plans for Every Cohort
          </h2>
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            We provide custom, tiered per-student pricing. Select your tier below and our team will
            provide an exact quotation based on your student volume and subject coverage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Tier 1: Independent Faculty */}
          <Card className="flex flex-col justify-between border-slate-200 hover:border-emerald-500/40 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl bg-white">
            <CardHeader className="pb-4">
              <div className="p-3 bg-emerald-50 rounded-xl w-fit text-[#0F7938] mb-4">
                <GraduationCap className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">
                Independent Faculty & Tutors
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 font-medium pt-1">
                For solo professors, tuition instructors, and private coaches with 15+ students.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <span className="text-sm font-semibold text-slate-700">Minimum: 15 Students</span>
                </div>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Bulk student vouchers & self-onboarding codes</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Teacher Cockpit: track student practice time & accuracy</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Windows desktop app push notifications for your class</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Batch-level weakness summary reports</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => scrollToForm('Independent Faculty (15+ students)')}
                className="w-full bg-[#0F7938] hover:bg-emerald-800 text-white font-semibold py-5 rounded-xl shadow-md"
              >
                Contact for Pricing
              </Button>
            </CardContent>
          </Card>

          {/* Tier 2: College / Academy Department (Highlighted) */}
          <Card className="flex flex-col justify-between border-2 border-[#0F7938] shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl bg-white relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0F7938] text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Most Popular
            </div>
            <CardHeader className="pb-4">
              <div className="p-3 bg-emerald-100 rounded-xl w-fit text-[#0F7938] mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">
                Colleges & Academy Departments
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 font-medium pt-1">
                For collegiate CA departments, coaching institutes, and tuition academies (50–250 students).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/60 rounded-lg text-center">
                  <span className="text-sm font-semibold text-emerald-900">Batch Size: 50–250 Students</span>
                </div>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Everything in Independent Faculty, plus:</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Multi-faculty seats & departmental admin roles</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Custom mock exam scheduling & automated grading</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Instant Windows Desktop notifications for mock announcements</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Dedicated onboarding specialist & CSV roster sync</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => scrollToForm('Colleges & Academy Departments (50-250 students)')}
                className="w-full bg-[#0F7938] hover:bg-emerald-800 text-white font-semibold py-5 rounded-xl shadow-md"
              >
                Contact for Pricing
              </Button>
            </CardContent>
          </Card>

          {/* Tier 3: Enterprise Institution */}
          <Card className="flex flex-col justify-between border-slate-200 hover:border-emerald-500/40 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl bg-white">
            <CardHeader className="pb-4">
              <div className="p-3 bg-emerald-50 rounded-xl w-fit text-[#0F7938] mb-4">
                <Users className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">
                Enterprise & Campus Rollout
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 font-medium pt-1">
                For major universities, multi-campus educational networks, and 250+ students.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <span className="text-sm font-semibold text-slate-700">Batch Size: 250+ Students</span>
                </div>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Full campus license with maximum volume discounts</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Unlimited faculty & administrative seats</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Automated student roster integration (API / CSV)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                    <span>Dedicated Key Account Manager & SLA guarantee</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => scrollToForm('Enterprise & Campus Rollout (250+ students)')}
                className="w-full bg-[#0F7938] hover:bg-emerald-800 text-white font-semibold py-5 rounded-xl shadow-md"
              >
                Contact for Pricing
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Scope of Service Section */}
      <section id="service-scope" className="py-20 bg-slate-900 text-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
              Institutional Capabilities
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">
              Comprehensive Scope of Service
            </h2>
            <p className="text-slate-400 text-sm md:text-base">
              Everything your institution or tutoring faculty needs to lead students to ICAP exam success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Scope 1: Windows App & Push Notifications */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-all space-y-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl w-fit">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">
                Windows App & Push Notifications
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Full compatibility with Preptio&apos;s downloaded Windows desktop app. Educators can trigger
                native Windows notifications for mock deadlines, homework reminders, and results.
              </p>
            </div>

            {/* Scope 2: Bulk Roster Provisioning */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-all space-y-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl w-fit">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">
                Bulk Student Provisioning
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Fast CSV roster uploading. Automated student activation links and single-dashboard license
                reassignment for upcoming terms without manual overhead.
              </p>
            </div>

            {/* Scope 3: Faculty Cockpit Analytics */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-all space-y-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl w-fit">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">
                Faculty Performance Analytics
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Track exam readiness scores across entire batches, pinpoint collective chapter
                weaknesses, and benchmark student practice time prior to ICAP attempts.
              </p>
            </div>

            {/* Scope 4: Custom Mock Engine */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-all space-y-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl w-fit">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">
                Custom Mocks & Question Bank
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Conduct timed chapter tests and full-syllabus ICAP mock simulations with automated
                instant scoring and detailed step-by-step explanations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry & Contact Form Section */}
      <section id="inquiry-form-section" className="py-20 px-6 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white p-8 md:p-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300">
              <Bell className="w-3.5 h-3.5" />
              <span>Prompt Response Guaranteed</span>
            </div>
            <h3 className="font-heading text-2xl md:text-3xl font-bold">
              Request Institutional Pricing & Consultation
            </h3>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Complete the inquiry form below. Our institutional partnerships team will review your cohort
              size and email you within <strong>24 to 48 hours</strong> with custom pricing and demo details.
            </p>
          </div>

          <div className="p-8 md:p-10">
            {submittedSuccess ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-[#0F7938] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="font-heading text-2xl font-bold text-slate-900">
                  Thank You for Your Inquiry!
                </h4>
                <p className="text-slate-600 max-w-md mx-auto text-sm leading-relaxed">
                  Your request has been forwarded to our institutional support team (<strong>support@preptio.com</strong>).
                  We have also sent an automated confirmation email to <strong>{formData.email}</strong>.
                  Our team will contact you within <strong>24 to 48 hours</strong>.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={() => {
                      setSubmittedSuccess(false)
                      setFormData(INITIAL_FORM)
                    }}
                    variant="outline"
                    className="border-slate-300"
                  >
                    Submit Another Inquiry
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Your Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Prof. Tariq Mahmood"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="border-slate-300 focus:border-[#0F7938]"
                    />
                  </div>

                  {/* Work Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Work / Academic Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="email"
                      placeholder="name@college.edu.pk or tutor@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="border-slate-300 focus:border-[#0F7938]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Phone / WhatsApp */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Phone / WhatsApp Number
                    </label>
                    <Input
                      placeholder="+92 300 1234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="border-slate-300 focus:border-[#0F7938]"
                    />
                  </div>

                  {/* Institution Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Institution / Academy Name
                    </label>
                    <Input
                      placeholder="e.g. Apex College of Commerce or Independent Tutor"
                      value={formData.institute}
                      onChange={(e) => setFormData({ ...formData, institute: e.target.value })}
                      className="border-slate-300 focus:border-[#0F7938]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Role */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Your Role</label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F7938]"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="Dean / Principal">Dean / Principal</option>
                      <option value="Department Head">Department Head</option>
                      <option value="Independent Faculty / Tutor">Independent Faculty / Tutor</option>
                      <option value="Academic Coordinator">Academic Coordinator</option>
                      <option value="Campus Administrator">Campus Administrator</option>
                    </select>
                  </div>

                  {/* Estimated Student Count */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Student Count <span className="text-xs font-normal text-slate-500">(Min. 15)</span>
                    </label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F7938]"
                      value={formData.studentCount}
                      onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
                    >
                      <option value="15-50">15 – 50 Students</option>
                      <option value="50-100">50 – 100 Students</option>
                      <option value="100-250">100 – 250 Students</option>
                      <option value="250-500">250 – 500 Students</option>
                      <option value="500+">500+ Students (Enterprise)</option>
                    </select>
                  </div>

                  {/* Target Levels / Subjects */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Target Level</label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F7938]"
                      value={formData.subjects}
                      onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                    >
                      <option value="PRC & CAF">PRC & CAF</option>
                      <option value="PRC Only">PRC Only</option>
                      <option value="CAF Only">CAF Only</option>
                      <option value="CFAP & MSA">CFAP & MSA</option>
                      <option value="All Levels (Full Suite)">All Levels (Full Suite)</option>
                    </select>
                  </div>
                </div>

                {/* Requirements / Message */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Specific Requirements or Questions
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="Tell us about your upcoming exam batch, semester timeline, or custom mock requirements..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="border-slate-300 focus:border-[#0F7938]"
                  />
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-start gap-3 text-xs text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-[#0F7938] shrink-0 mt-0.5" />
                  <span>
                    Upon clicking Submit, an inquiry notice will be delivered directly to{' '}
                    <strong>support@preptio.com</strong> and you will receive an immediate confirmation
                    receipt in your email. Our team will contact you within 24 to 48 hours.
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full bg-[#0F7938] hover:bg-emerald-800 text-white font-semibold py-6 rounded-xl shadow-lg transition-all"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Dispatching Inquiry...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Submit Inquiry & Request Proposal
                    </span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-16 px-6 max-w-4xl mx-auto w-full">
        <h3 className="font-heading text-2xl md:text-3xl font-bold text-center mb-10 text-slate-900">
          Institutional Frequently Asked Questions
        </h3>
        <div className="space-y-4">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#0F7938]" />
              Can independent teachers with private students apply?
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed pl-6">
              Yes! If you teach private batches or tuition groups with at least 15 students, you qualify
              for institutional volume pricing, educator dashboard access, and batch analytics.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#0F7938]" />
              How do Windows app push notifications work for our students?
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed pl-6">
              Students who download Preptio&apos;s Windows application receive native desktop push
              notifications directly on their taskbar / Action Center whenever instructors schedule a mock
              exam, post critical study notices, or publish performance benchmarks.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#0F7938]" />
              How are student accounts provisioned?
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed pl-6">
              You can simply upload a CSV list of student names and emails. Our system automatically
              creates their accounts, dispatches credentials, and links them directly to your faculty
              dashboard.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
