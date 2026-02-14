'use client'

import { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

export default function AdminDemoSettingsPage() {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [demoSettings, setDemoSettings] = useState({
    demoEnabled: true,
    demoMaxQuestions: 10,
    demoTimeMinutes: 20,
    demoSubjects: [] as string[],
  })
  const [availableSubjects, setAvailableSubjects] = useState<{ code: string; name: string }[]>([])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/system/settings')
        if (!response.ok) return
        const data = await response.json()
        const settings = data.testSettings || {}
        setDemoSettings({
          demoEnabled: typeof settings.demoEnabled === 'boolean' ? settings.demoEnabled : true,
          demoMaxQuestions: Number(settings.demoMaxQuestions) || 10,
          demoTimeMinutes: Number(settings.demoTimeMinutes) || 20,
          demoSubjects: Array.isArray(settings.demoSubjects)
            ? settings.demoSubjects.map((code: string) => String(code).toUpperCase())
            : [],
        })
      } catch (error) {
        // ignore
      }
    }

    const loadSubjects = async () => {
      try {
        const response = await fetch('/api/admin/subjects')
        if (!response.ok) return
        const data = await response.json()
        const list = (data.subjects || []).map((item: any) => ({
          code: String(item.code || '').toUpperCase(),
          name: item.name || item.code,
        }))
        setAvailableSubjects(list)
      } catch (error) {
        // ignore
      }
    }

    loadSettings()
    loadSubjects()
  }, [])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSettings: {
            demoEnabled: demoSettings.demoEnabled,
            demoMaxQuestions: demoSettings.demoMaxQuestions,
            demoTimeMinutes: demoSettings.demoTimeMinutes,
            demoSubjects: demoSettings.demoSubjects,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }
      toast({
        title: 'Saved',
        description: 'Demo test settings updated successfully.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save demo settings.',
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
        <div className="max-w-6xl mx-auto px-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Demo Test Settings</CardTitle>
              <CardDescription>
                Control demo availability, time, and which subjects are allowed.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Enable Demo Test</Label>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={demoSettings.demoEnabled}
                      onCheckedChange={(checked) =>
                        setDemoSettings((prev) => ({ ...prev, demoEnabled: checked }))
                      }
                    />
                    <span className="text-sm text-text-light">
                      {demoSettings.demoEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Demo Questions (max 10)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={demoSettings.demoMaxQuestions}
                    onChange={(e) =>
                      setDemoSettings((prev) => ({
                        ...prev,
                        demoMaxQuestions: Math.min(10, Math.max(1, Number(e.target.value) || 10)),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Demo Time (minutes)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="60"
                    value={demoSettings.demoTimeMinutes}
                    onChange={(e) =>
                      setDemoSettings((prev) => ({
                        ...prev,
                        demoTimeMinutes: Number(e.target.value) || 20,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Allowed Demo Subjects</Label>
                <p className="text-xs text-text-light">
                  If none selected, demo will pull questions from all subjects.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availableSubjects.map((subject) => {
                    const checked = demoSettings.demoSubjects.includes(subject.code)
                    return (
                      <label key={subject.code} className="flex items-center gap-2 text-sm text-text-dark">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary-green"
                          checked={checked}
                          onChange={() => {
                            setDemoSettings((prev) => {
                              const exists = prev.demoSubjects.includes(subject.code)
                              return {
                                ...prev,
                                demoSubjects: exists
                                  ? prev.demoSubjects.filter((code) => code !== subject.code)
                                  : [...prev.demoSubjects, subject.code],
                              }
                            })
                          }}
                        />
                        <span>{subject.name} ({subject.code})</span>
                      </label>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDemoSettings((prev) => ({
                        ...prev,
                        demoSubjects: availableSubjects.map((item) => item.code),
                      }))
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDemoSettings((prev) => ({ ...prev, demoSubjects: [] }))}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-text-light">
                  Demo is always randomized (any chapter within allowed subjects).
                </p>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Demo Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
