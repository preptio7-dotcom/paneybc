'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Facebook, X, Linkedin, Instagram, Mail, Phone, MapPin } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-slate-950 text-white pt-20 pb-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Section */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3 font-heading font-bold text-2xl text-primary-green tracking-tight">
              <Image src="/web-app-manifest-192x192.png" alt="Preptio logo" width={36} height={36} className="rounded-md" />
              <span>Preptio</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              The ultimate platform for CA exam candidates. Master your professional exams with over 2000+ real exam-style questions and detailed explanations.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white">
                <Facebook size={18} />
              </Link>
              <Link href="#" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white">
                <X size={18} />
              </Link>
              <Link href="#" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white">
                <Instagram size={18} />
              </Link>
              <Link href="#" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white">
                <Linkedin size={18} />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="font-heading font-bold text-lg">Quick Links</h4>
            <div className="flex flex-col gap-3">
              <Link href="/" className="text-slate-400 hover:text-primary-green text-sm transition-colors">Home</Link>
              <Link href="/about" className="text-slate-400 hover:text-primary-green text-sm transition-colors">About Us</Link>
              <Link href="/subjects" className="text-slate-400 hover:text-primary-green text-sm transition-colors">Subjects</Link>
              <Link href="/join-us" className="text-slate-400 hover:text-primary-green text-sm transition-colors">Join Us</Link>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-6">
            <h4 className="font-heading font-bold text-lg">Resources</h4>
            <div className="flex flex-col gap-3">
              <Link href="/auth/login" className="text-slate-400 hover:text-primary-green text-sm transition-colors">Student Login</Link>
              <Link href="/auth/signup" className="text-slate-400 hover:text-primary-green text-sm transition-colors">Register Account</Link>
              <Link href="/privacy" className="text-slate-400 hover:text-primary-green text-sm transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-slate-400 hover:text-primary-green text-sm transition-colors">Terms of Service</Link>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <h4 className="font-heading font-bold text-lg">Contact Us</h4>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <Mail size={16} className="text-primary-green" />
                <span>preptio7@gmail.com</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <Phone size={16} className="text-primary-green" />
                <span>+92 (323) 951-3175</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm leading-relaxed">
                <MapPin size={16} className="text-primary-green shrink-0" />
                <span>Karachi, Pakistan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-[13px]">
          <p>© {currentYear} <Link href="https://forgeweb.dev" className="text-primary-green">ForgeWeb</Link> All rights reserved.</p>
          <div className="flex items-center gap-6">
            <p>Designed for Excellence.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
