'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '@/components/admin-header'
import { CasesTable } from '@/components/admin/financial-statements/CasesTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function AdminFinancialStatementsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [cases, setCases] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadCases = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/financial-statements')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load cases')
      setCases(data.cases || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load cases.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [])

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/financial-statements/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update status')
      loadCases()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this case? This cannot be undone.')) return
    try {
      const response = await fetch(`/api/admin/financial-statements/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete case')
      loadCases()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete case.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-background-light">
      <AdminHeader />
      <main className="pt-[90px] pb-12 px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="border-border bg-white">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Financial Statement Cases</CardTitle>
                <CardDescription>Manage trial balance cases for SOCI & SOFP practice.</CardDescription>
              </div>
              <Button onClick={() => router.push('/admin/financial-statements/create')}>
                Create New Case
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-primary-green" size={28} />
                </div>
              ) : cases.length === 0 ? (
                <p className="text-text-light text-sm">No cases yet. Create the first one.</p>
              ) : (
                <CasesTable
                  cases={cases}
                  onEdit={(id) => router.push(`/admin/financial-statements/edit/${id}`)}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
