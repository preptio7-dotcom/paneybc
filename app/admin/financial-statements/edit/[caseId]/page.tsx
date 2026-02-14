'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminHeader } from '@/components/admin-header'
import { CaseForm, CaseFormValues } from '@/components/admin/financial-statements/CaseForm'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function EditFinancialStatementCasePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const caseId = params.caseId as string
  const [initialValues, setInitialValues] = useState<CaseFormValues | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/admin/financial-statements/${caseId}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load case')
        const caseData = data.case
        setInitialValues({
          caseNumber: caseData.caseNumber,
          title: caseData.title,
          trialBalancePdfUrl: caseData.trialBalancePdfUrl,
          additionalInfo: caseData.additionalInfo || '',
          defaultTimeLimit: caseData.defaultTimeLimit || 45,
          isActive: Boolean(caseData.isActive),
          showThousandsNote: Boolean(caseData.showThousandsNote),
          sociLineItems: (caseData.sociLineItems || []).map((item: any) => ({
            id: String(item.id),
            heading: item.heading,
            inputType: item.inputType || 'dropdown',
            dropdownOptions: item.dropdownOptions || [],
            correctValue: item.correctValue,
            marks: Number(item.marks),
            displayOrder: Number(item.displayOrder),
          })),
          sofpLineItems: (caseData.sofpLineItems || []).map((item: any) => ({
            id: String(item.id),
            heading: item.heading,
            inputType: item.inputType || 'dropdown',
            groupLabel: item.groupLabel || '',
            dropdownOptions: item.dropdownOptions || [],
            correctValue: item.correctValue,
            marks: Number(item.marks),
            displayOrder: Number(item.displayOrder),
          })),
        })
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load case.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [caseId, toast])

  const handleSubmit = async (values: CaseFormValues) => {
    const response = await fetch(`/api/admin/financial-statements/${caseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await response.json()
    if (!response.ok) {
      toast({ title: 'Error', description: data.error || 'Failed to update case.', variant: 'destructive' })
      return false
    }
    toast({ title: 'Case updated', description: 'Financial statement case updated successfully.' })
    router.push('/admin/financial-statements')
    return true
  }

  return (
    <div className="min-h-screen bg-background-light">
      <AdminHeader />
      <main className="pt-[90px] pb-12 px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-text-dark">Edit Financial Statement Case</h1>
            <p className="text-text-light">Update trial balance and line items.</p>
          </div>
          {isLoading || !initialValues ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-primary-green" size={28} />
            </div>
          ) : (
            <CaseForm
              initialValues={initialValues}
              submitLabel="Update Case"
              onSubmit={handleSubmit}
              onCancel={() => router.push('/admin/financial-statements')}
              draftKey={`fs-case-edit-${caseId}`}
            />
          )}
        </div>
      </main>
    </div>
  )
}
