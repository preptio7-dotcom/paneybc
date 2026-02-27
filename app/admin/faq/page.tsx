'use client'

import { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { faqData } from '@/data/faq-data'
import { Plus, Trash2 } from 'lucide-react'

type EditableFaqItem = {
  question: string
  answer: string
}

export default function AdminFaqPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [items, setItems] = useState<EditableFaqItem[]>(faqData)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/admin/system/settings')
        if (!response.ok) {
          throw new Error('Failed to load FAQ settings')
        }
        const data = await response.json()
        const faq = data?.testSettings?.faq || {}
        const loadedItems = Array.isArray(faq.items)
          ? faq.items
              .map((item: any) => ({
                question: String(item?.question || '').trim(),
                answer: String(item?.answer || '').trim(),
              }))
              .filter((item: EditableFaqItem) => item.question && item.answer)
          : []

        setItems(loadedItems.length ? loadedItems : faqData)
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Unable to load FAQ settings.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [toast])

  const updateItem = (index: number, key: keyof EditableFaqItem, value: string) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    )
  }

  const addItem = () => {
    setItems((prev) => [...prev, { question: '', answer: '' }])
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleSave = async () => {
    const normalizedItems = items
      .map((item) => ({
        question: String(item.question || '').trim(),
        answer: String(item.answer || '').trim(),
      }))
      .filter((item) => item.question || item.answer)

    if (!normalizedItems.length) {
      toast({
        title: 'Validation error',
        description: 'Add at least one FAQ question and answer.',
        variant: 'destructive',
      })
      return
    }

    const firstInvalidIndex = normalizedItems.findIndex((item) => !item.question || !item.answer)
    if (firstInvalidIndex >= 0) {
      toast({
        title: 'Validation error',
        description: `Question ${firstInvalidIndex + 1} must include both question and answer.`,
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSettings: {
            faq: {
              items: normalizedItems,
            },
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save FAQ settings')
      }
      setItems(normalizedItems)
      toast({
        title: 'Saved',
        description: 'FAQ settings updated successfully.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save FAQ settings.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[80px] pb-12">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-text-dark">FAQ Settings</h1>
            <p className="text-text-light">
              Edit FAQ content. Visibility is managed in Beta Features.
            </p>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>FAQ Items</CardTitle>
              <CardDescription>
                Update question and answer text. Changes are applied site-wide.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {items.map((item, index) => (
                <div key={`${index}-${item.question.slice(0, 20)}`} className="rounded-lg border border-border p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-text-dark">Question {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1 || isLoading || isSaving}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label>Question</Label>
                    <Input
                      value={item.question}
                      onChange={(e) => updateItem(index, 'question', e.target.value)}
                      placeholder="Enter FAQ question"
                      disabled={isLoading || isSaving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Answer</Label>
                    <Textarea
                      value={item.answer}
                      onChange={(e) => updateItem(index, 'answer', e.target.value)}
                      placeholder="Enter FAQ answer"
                      className="min-h-[100px]"
                      disabled={isLoading || isSaving}
                    />
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addItem} disabled={isLoading || isSaving} className="gap-2">
                <Plus size={14} />
                Add FAQ Item
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isLoading || isSaving}>
              {isSaving ? 'Saving...' : 'Save FAQ Settings'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
