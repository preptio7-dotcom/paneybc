import React from 'react'
import { Laptop } from 'lucide-react'

export default function UnsupportedDevice() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="flex justify-center">
                    <div className="p-6 bg-red-500/10 rounded-full border border-red-500/20">
                        <Laptop className="text-red-500" size={64} />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-white tracking-tight">
                    Desktop Only Access
                </h1>

                <p className="text-gray-400 text-lg leading-relaxed">
                    The Preptio is optimized for professional learning and timed exams, which require a desktop experience.
                    <br /><br />
                    Please access this website from a <strong>Laptop or Desktop computer</strong> to continue.
                </p>

                <div className="pt-8 text-sm text-gray-500 font-mono">
                    ID: ERR_MOBILE_RESTRICTED
                </div>
            </div>
        </div>
    )
}
