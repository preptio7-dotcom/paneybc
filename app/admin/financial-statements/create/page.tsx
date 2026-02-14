'use client'

import { useRouter } from 'next/navigation'
import { AdminHeader } from '@/components/admin-header'
import { CaseForm, CaseFormValues } from '@/components/admin/financial-statements/CaseForm'
import { useToast } from '@/hooks/use-toast'

export default function CreateFinancialStatementCasePage() {
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (values: CaseFormValues) => {
    const response = await fetch('/api/admin/financial-statements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await response.json()
    if (!response.ok) {
      toast({ title: 'Error', description: data.error || 'Failed to create case.', variant: 'destructive' })
      return false
    }
    toast({ title: 'Case created', description: 'Financial statement case created successfully.' })
    router.push('/admin/financial-statements')
    return true
  }

  return (
    <div className="min-h-screen bg-background-light">
      <AdminHeader />
      <main className="pt-[90px] pb-12 px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-text-dark">Create Financial Statement Case</h1>
            <p className="text-text-light">Add trial balance details, SOCI and SOFP line items.</p>
          </div>
          <CaseForm
            submitLabel="Create Case"
            onSubmit={handleSubmit}
            onCancel={() => router.push('/admin/financial-statements')}
            draftKey="fs-case-create"
          />
        </div>
      </main>
    </div>
  )
}
