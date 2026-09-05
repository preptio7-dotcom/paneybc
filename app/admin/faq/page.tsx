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
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

type EditableFaqItem = {
  id: string
  question: string
  answer: string
}

const FEATURED_LIMIT = 5

function makeId(prefix = 'faq-item') {
  const randomPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${randomPart}`
}

export default function AdminFaqPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [items, setItems] = useState<EditableFaqItem[]>(faqData)
  const [featuredIds, setFeaturedIds] = useState<string[]>(
    faqData.slice(0, FEATURED_LIMIT).map((item) => item.id)
  )

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
              .map((item: any, index: number) => ({
                id: String(item?.id || '').trim() || `faq-item-${index + 1}`,
                question: String(item?.question || '').trim(),
                answer: String(item?.answer || '').trim(),
              }))
              .filter((item: EditableFaqItem) => item.id && item.question && item.answer)
          : []

        const nextItems = loadedItems.length ? loadedItems : faqData
        const validIds = new Set(nextItems.map((item) => item.id))
        const savedFeaturedIds = Array.isArray(faq.featuredIds)
          ? faq.featuredIds
              .map((id: any) => String(id || '').trim())
              .filter((id: string) => Boolean(id) && validIds.has(id))
          : []
        const nextFeaturedIds = savedFeaturedIds.length
          ? Array.from(new Set(savedFeaturedIds)).slice(0, FEATURED_LIMIT)
          : nextItems.slice(0, FEATURED_LIMIT).map((item) => item.id)

        setItems(nextItems)
        setFeaturedIds(nextFeaturedIds)
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

  const updateItem = (index: number, key: keyof Omit<EditableFaqItem, 'id'>, value: string) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    )
  }

  const addItem = () => {
    setItems((prev) => [...prev, { id: makeId(), question: '', answer: '' }])
  }

  const removeItem = (index: number) => {
    const itemId = items[index]?.id
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
    if (itemId) {
      setFeaturedIds((prev) => prev.filter((id) => id !== itemId))
    }
  }

  const toggleFeatured = (itemId: string, checked: boolean) => {
    if (checked) {
      setFeaturedIds((prev) => {
        if (prev.includes(itemId)) return prev
        if (prev.length >= FEATURED_LIMIT) {
          toast({
            title: 'Limit reached',
            description: `You can feature only ${FEATURED_LIMIT} questions on homepage.`,
            variant: 'destructive',
          })
          return prev
        }
        return [...prev, itemId]
      })
      return
    }
    setFeaturedIds((prev) => prev.filter((id) => id !== itemId))
  }

  const moveFeatured = (itemId: string, direction: 'up' | 'down') => {
    setFeaturedIds((prev) => {
      const index = prev.indexOf(itemId)
      if (index < 0) return prev
      if (direction === 'up' && index === 0) return prev
      if (direction === 'down' && index === prev.length - 1) return prev

      const next = [...prev]
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
      return next
    })
  }

  const handleSave = async () => {
    const normalizedItems = items
      .map((item, index) => ({
        id: String(item.id || '').trim() || `faq-item-${index + 1}`,
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

    const validIds = new Set(normalizedItems.map((item) => item.id))
    const normalizedFeaturedIds = featuredIds.filter((id) => validIds.has(id)).slice(0, FEATURED_LIMIT)

    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSettings: {
            faq: {
              items: normalizedItems,
              featuredIds: normalizedFeaturedIds,
            },
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save FAQ settings')
      }
      setItems(normalizedItems)
      setFeaturedIds(normalizedFeaturedIds)
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

  const featuredItems = featuredIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is EditableFaqItem => Boolean(item))

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="max-w-5xl mx-auto px-4 md:px-6 space-y-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-text-dark">FAQ Settings</h1>
            <p className="text-text-light">
              Edit FAQ content and choose which 5 questions appear first on homepage.
            </p>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Homepage Featured Questions</CardTitle>
              <CardDescription>
                Select up to {FEATURED_LIMIT} questions and arrange the exact display order.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {featuredItems.length === 0 ? (
                <p className="text-sm text-text-light">No featured questions selected yet.</p>
              ) : (
                featuredItems.map((item, index) => (
                  <div key={item.id} className="rounded-lg border border-border bg-white p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Position {index + 1}</p>
                      <p className="font-medium text-text-dark">{item.question}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveFeatured(item.id, 'up')}
                        disabled={index === 0 || isLoading || isSaving}
                      >
                        <ArrowUp size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveFeatured(item.id, 'down')}
                        disabled={index === featuredItems.length - 1 || isLoading || isSaving}
                      >
                        <ArrowDown size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>FAQ Items</CardTitle>
              <CardDescription>
                Update question and answer text. Changes are applied site-wide.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {items.map((item, index) => {
                const isFeatured = featuredIds.includes(item.id)
                return (
                  <div key={item.id} className="rounded-lg border border-border p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-text-dark">Question {index + 1}</p>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={isFeatured}
                            onChange={(e) => toggleFeatured(item.id, e.target.checked)}
                            disabled={isLoading || isSaving}
                          />
                          Featured on Home
                        </label>
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
                )
              })}

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


