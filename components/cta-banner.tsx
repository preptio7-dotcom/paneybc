'use client'

import React from 'react'
import { Button } from './ui/button'
import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export function CTABanner() {
  const router = useRouter()
  const { user } = useAuth()
  const handleStartClick = () => {
    if (user) { 
      router.push('/dashboard')
    } else {
      router.push('/auth/login')
    }
  }
  return (
    <section className="w-full bg-primary-green py-20">
      <div className="max-w-7xl mx-auto w-full px-6 text-center">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Ace Your CA Exam?
        </h2>
        
        <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
          Join thousands of successful students who have improved their scores with our platform
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-white text-primary-green hover:bg-background-light gap-2"
            onClick={handleStartClick}
          >
            Get Started Free
            <ArrowRight size={20} />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white text-white hover:bg-white/10 bg-transparent"
            onClick={() => router.push('/about')}
            >
            Learn More
          </Button>
        </div>
      </div>
    </section>
  )
}
