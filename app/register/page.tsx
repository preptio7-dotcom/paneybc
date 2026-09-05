"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/auth/signup")
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-1 flex items-center justify-center p-4 pt-24">
        <div className="text-center text-gray-600">
          Redirecting to the new sign up page...
        </div>
      </div>
    </div>
  )
}
