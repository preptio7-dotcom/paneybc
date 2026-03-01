'use client'

import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LayoutDashboard, FileText, Settings, Users, Database, Plus, Flag, PlayCircle, Shield, X } from 'lucide-react'
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
        registrationDegrees: ['CA'],
        registrationLevels: ['PRC', 'CAF'],
    })
    const [newDegree, setNewDegree] = useState('')
    const [newLevel, setNewLevel] = useState('')
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
                        registrationDegrees: Array.isArray(data.testSettings.registrationDegrees) && data.testSettings.registrationDegrees.length
                            ? data.testSettings.registrationDegrees
                            : ['CA'],
                        registrationLevels: Array.isArray(data.testSettings.registrationLevels) && data.testSettings.registrationLevels.length
                            ? data.testSettings.registrationLevels
                            : ['PRC', 'CAF'],
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
            title: 'FAQ Settings',
            description: 'Manage FAQ questions and answers.',
            href: '/admin/faq',
            icon: Settings,
        },
        {
            title: 'Student Feedback',
            description: 'Moderate homepage feedback (approve/reject/delete).',
            href: '/admin/feedback',
            icon: FileText,
        },
        {
            title: 'Beta Features',
            description: 'Control which features are public or ambassador-only.',
            href: '/admin/beta-features',
            icon: Flag,
        },
        {
            title: 'Security Overview',
            description: 'Check threat status and access platform security tools.',
            href: '/admin/security',
            icon: Shield,
        },
        {
            title: 'IP Security',
            description: 'Review suspicious traffic, block IPs, and manage whitelist.',
            href: '/admin/ip-security',
            icon: Settings,
        },
        {
            title: 'Audit Logs',
            description: 'Track who changed admin settings and user controls.',
            href: '/admin/audit-logs',
            icon: FileText,
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
                        registrationDegrees: testSettings.registrationDegrees,
                        registrationLevels: testSettings.registrationLevels,
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

    const addOption = (type: 'degree' | 'level') => {
        const value = (type === 'degree' ? newDegree : newLevel).trim()
        if (!value) return
        if (type === 'degree') {
            setTestSettings((prev) => ({
                ...prev,
                registrationDegrees: Array.from(new Set([...prev.registrationDegrees, value])),
            }))
            setNewDegree('')
            return
        }
        setTestSettings((prev) => ({
            ...prev,
            registrationLevels: Array.from(new Set([...prev.registrationLevels, value])),
        }))
        setNewLevel('')
    }

    const removeOption = (type: 'degree' | 'level', value: string) => {
        if (type === 'degree') {
            setTestSettings((prev) => ({
                ...prev,
                registrationDegrees: prev.registrationDegrees.filter((item) => item !== value),
            }))
            return
        }
        setTestSettings((prev) => ({
            ...prev,
            registrationLevels: prev.registrationLevels.filter((item) => item !== value),
        }))
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
                                <div className="space-y-3">
                                    <Label>Registration Degrees</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {testSettings.registrationDegrees.map((degree) => (
                                            <span key={degree} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                {degree}
                                                <button type="button" onClick={() => removeOption('degree', degree)}>
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input value={newDegree} placeholder="Add degree" onChange={(e) => setNewDegree(e.target.value)} />
                                        <Button type="button" variant="outline" onClick={() => addOption('degree')}>Add</Button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label>Registration Levels</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {testSettings.registrationLevels.map((level) => (
                                            <span key={level} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                {level}
                                                <button type="button" onClick={() => removeOption('level', level)}>
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input value={newLevel} placeholder="Add level (e.g. CAF)" onChange={(e) => setNewLevel(e.target.value)} />
                                        <Button type="button" variant="outline" onClick={() => addOption('level')}>Add</Button>
                                    </div>
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
