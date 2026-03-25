'use client'

import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
            <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-700">

                {/* Icon Container */}
                <div className="flex justify-center">
                    <div className="p-6 bg-green-500/10 rounded-full border border-green-500/20 shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)] animate-pulse">
                        <FileQuestion className="text-primary-green" size={64} />
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                        Page Not Found
                    </h1>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                        Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Link href="/" className="w-full sm:w-auto">
                        <Button className="w-full h-12 bg-primary-green hover:bg-primary-green/90 text-black font-bold text-md rounded-xl shadow-lg shadow-green-900/20 transition-all hover:scale-105">
                            <Home className="mr-2 h-5 w-5" />
                            Return Home
                        </Button>
                    </Link>

                    <Button
                        variant="outline"
                        className="w-full sm:w-auto h-12 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-xl"
                        onClick={() => window.history.back()}
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Go Back
                    </Button>
                </div>

                {/* Decorator */}
                <div className="pt-12">
                    <div className="h-1 w-24 bg-gradient-to-r from-transparent via-zinc-800 to-transparent mx-auto rounded-full" />
                </div>
            </div>
        </div>
    )
}
