'use client'

import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LayoutDashboard, FileText, Settings, Users, Database, Plus, Flag, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

export default function AdminDashboardPage() {
    const { toast } = useToast()
    const [stats, setStats] = useState([
        { title: 'Total Questions', value: '...', icon: Database, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Total Subjects', value: '...', icon: LayoutDashboard, color: 'text-green-600', bg: 'bg-green-100' },
        { title: 'Test Results', value: '...', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
        { title: 'Active Users', value: '...', icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
    ])
    const [isLoading, setIsLoading] = useState(true)
    const [testSettings, setTestSettings] = useState({
        fullBookTimeMinutes: 120,
        chapterTestDefaultMinutes: 30,
        chapterTestDefaultQuestions: 25,
    })
    const [isSavingTestSettings, setIsSavingTestSettings] = useState(false)

    useEffect(() => {
        fetchStats()
    }, [])

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await fetch('/api/admin/system/settings')
                if (!response.ok) return
                const data = await response.json()
                if (data.testSettings) {
                    setTestSettings({
                        fullBookTimeMinutes: Number(data.testSettings.fullBookTimeMinutes) || 120,
                        chapterTestDefaultMinutes: Number(data.testSettings.chapterTestDefaultMinutes) || 30,
                        chapterTestDefaultQuestions: Number(data.testSettings.chapterTestDefaultQuestions) || 25,
                    })
                }
            } catch (error) {
                // ignore
            }
        }

        loadSettings()
    }, [])

    const fetchStats = async () => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/admin/stats')
            if (response.ok) {
                const data = await response.json()
                setStats([
                    { title: 'Total Questions', value: data.stats.totalQuestions.toLocaleString(), icon: Database, color: 'text-blue-600', bg: 'bg-blue-100' },
                    { title: 'Total Subjects', value: data.stats.totalSubjects.toLocaleString(), icon: LayoutDashboard, color: 'text-green-600', bg: 'bg-green-100' },
                    { title: 'Test Results', value: data.stats.totalResults.toLocaleString(), icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
                    { title: 'Active Users', value: data.stats.totalUsers.toLocaleString(), icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
                ])
            }
        } catch (error) {
            console.error('Failed to fetch admin stats:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const actions = [
        {
            title: 'Manage Questions',
            description: 'View, edit, and bulk delete MCQs from the database.',
            href: '/admin/questions',
            icon: Database,
        },
        {
            title: 'Question Reports',
            description: 'Review and resolve user-reported questions.',
            href: '/admin/reports',
            icon: Flag,
        },
        {
            title: 'Demo Test Settings',
            description: 'Configure demo access, time, and allowed subjects.',
            href: '/admin/demo-settings',
            icon: PlayCircle,
        },
        {
            title: 'Sponsored Settings',
            description: 'Show or hide sponsored content and edit its message.',
            href: '/admin/ads',
            icon: FileText,
        },
        {
            title: 'Bulk Upload',
            description: 'Upload new learning materials via TXT or Direct Input.',
            href: '/admin/upload',
            icon: Plus,
        },
        {
            title: 'Subject Management',
            description: 'Create, update, or remove subjects from the platform.',
            href: '/admin/subjects',
            icon: Settings,
        },
        {
            title: 'Join Us Submissions',
            description: 'Review and reply to Join Us requests.',
            href: '/admin/join-us',
            icon: Users,
        },
        {
            title: 'User Management',
            description: 'View, ban, or delete registered users.',
            href: '/admin/users',
            icon: Users,
        },
    ]

    const handleSaveTestSettings = async () => {
        try {
            setIsSavingTestSettings(true)
            const response = await fetch('/api/admin/system/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testSettings: {
                        fullBookTimeMinutes: testSettings.fullBookTimeMinutes,
                        chapterTestDefaultMinutes: testSettings.chapterTestDefaultMinutes,
                        chapterTestDefaultQuestions: testSettings.chapterTestDefaultQuestions,
                    },
                }),
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save settings')
            }
            toast({
                title: 'Saved',
                description: 'Test settings updated successfully.',
            })
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save test settings.',
                variant: 'destructive',
            })
        } finally {
            setIsSavingTestSettings(false)
        }
    }

    return (
        <main className="min-h-screen bg-background-light">
            <AdminHeader />

            <div className="pt-[80px] pb-12">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-8">
                        <h1 className="font-heading text-3xl font-bold text-text-dark">Admin Dashboard</h1>
                        <p className="text-text-light">Overview of platform content and activity</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {stats.map((stat, index) => (
                            <Card key={index} className="border-border">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${stat.bg}`}>
                                            <stat.icon size={24} className={stat.color} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-text-light">{stat.title}</p>
                                            <p className="text-2xl font-bold text-text-dark">{stat.value}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Test Settings */}
                    <h2 className="font-heading text-2xl font-bold text-text-dark mb-6">Test Settings</h2>
                    <Card className="border-border mb-12">
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Full Book Time (minutes)</Label>
                                    <Input
                                        type="number"
                                        min="30"
                                        max="300"
                                        value={testSettings.fullBookTimeMinutes}
                                        onChange={(e) => setTestSettings((prev) => ({ ...prev, fullBookTimeMinutes: Number(e.target.value) || 120 }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Chapter Test Time (minutes)</Label>
                                    <Input
                                        type="number"
                                        min="5"
                                        max="240"
                                        value={testSettings.chapterTestDefaultMinutes}
                                        onChange={(e) => setTestSettings((prev) => ({ ...prev, chapterTestDefaultMinutes: Number(e.target.value) || 30 }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Chapter Test Questions</Label>
                                    <Input
                                        type="number"
                                        min="5"
                                        max="200"
                                        value={testSettings.chapterTestDefaultQuestions}
                                        onChange={(e) => setTestSettings((prev) => ({ ...prev, chapterTestDefaultQuestions: Number(e.target.value) || 25 }))}
                                    />
                                </div>
                            </div>
                            <Button onClick={handleSaveTestSettings} disabled={isSavingTestSettings}>
                                {isSavingTestSettings ? 'Saving...' : 'Save Test Settings'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <h2 className="font-heading text-2xl font-bold text-text-dark mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {actions.map((action, index) => (
                            <Link href={action.href} key={index}>
                                <Card className="border-border hover:shadow-md transition-shadow cursor-pointer h-full">
                                    <CardHeader>
                                        <div className="w-12 h-12 rounded-xl bg-primary-green/10 flex items-center justify-center mb-4 text-primary-green">
                                            <action.icon size={24} />
                                        </div>
                                        <CardTitle className="text-xl">{action.title}</CardTitle>
                                        <CardDescription>{action.description}</CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

        </main>
    )
}
