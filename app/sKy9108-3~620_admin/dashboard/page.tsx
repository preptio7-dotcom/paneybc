'use client'

import React, { useEffect, useState } from 'react'
import {
    Users,
    MessageSquare,
    Eye,
    TrendingUp,
    ArrowUpRight,
    Clock,
    User,
    CheckCircle2,
    Loader2
} from 'lucide-react'
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MaintenanceModal } from '@/components/MaintenanceModal'
import { toast } from 'sonner'

export default function AdminOverview() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isMaintenance, setIsMaintenance] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [toggling, setToggling] = useState(false)

    useEffect(() => {
        fetch('/api/admin/super-stats')
            .then(res => res.json())
            .then(json => {
                setData(json)
                setIsMaintenance(json.stats.isMaintenanceMode)
                setLoading(false)
            })
            .catch(err => {
                console.error('Failed to load stats:', err)
                setLoading(false)
            })
    }, [])

    const toggleMaintenance = async (enabled: boolean) => {
        setToggling(true)
        try {
            const res = await fetch('/api/admin/system/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            })
            const result = await res.json()
            if (result.success) {
                setIsMaintenance(result.isMaintenanceMode)
                toast.success(result.isMaintenanceMode
                    ? 'Platform taken down successfully. Maintenance mode active.'
                    : 'Platform is now LIVE. Access restored for all users.',
                    { duration: 5000 }
                )
            } else {
                toast.error('Failed to update platform state. Please check logs.')
            }
        } catch (err) {
            console.error('Toggle failed', err)
            toast.error('A network error occurred. Failed to toggle maintenance.')
        } finally {
            setToggling(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="h-10 w-48 bg-gray-900 rounded-lg animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-900 rounded-2xl animate-pulse" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="h-96 bg-gray-900 rounded-2xl animate-pulse" />
                    <div className="h-96 bg-gray-900 rounded-2xl animate-pulse" />
                </div>
            </div>
        )
    }

    const { stats, recentMessages, recentVisits, charts } = data

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Platform Overview</h1>
                    <p className="text-gray-400 mt-1 md:mt-2 text-sm md:text-base">Real-time snapshots of your platform's health and activity.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    disabled={toggling}
                    className={`w-full md:w-auto px-4 py-3 md:py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${isMaintenance
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-primary-green hover:bg-primary-green/90 text-black'
                        }`}
                >
                    {toggling ? <Loader2 className="animate-spin" size={18} /> : (isMaintenance ? <CheckCircle2 size={18} /> : <div className="w-2 h-2 bg-black rounded-full animate-pulse" />)}
                    {isMaintenance ? 'Site is DOWN (Maintenance)' : 'Take Down Site'}
                </button>
            </div>

            <MaintenanceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={toggleMaintenance}
                isCurrentlyEnabled={isMaintenance}
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden group hover:border-blue-500/30 transition-all">
                    <CardContent className="p-5 md:p-6">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <Users className="text-blue-500" size={24} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
                            <p className="text-2xl md:text-3xl font-bold text-white mt-1">{stats.totalUsers}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden group hover:border-yellow-500/30 transition-all">
                    <CardContent className="p-5 md:p-6">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-yellow-500/10 rounded-xl">
                                <MessageSquare className="text-yellow-500" size={24} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-gray-500 text-sm font-medium">Unread Messages</h3>
                            <p className="text-2xl md:text-3xl font-bold text-white mt-1">{stats.totalMessages}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden group hover:border-primary-green/30 transition-all">
                    <CardContent className="p-5 md:p-6">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-primary-green/10 rounded-xl">
                                <Eye className="text-primary-green" size={24} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-gray-500 text-sm font-medium">Total Views</h3>
                            <p className="text-2xl md:text-3xl font-bold text-white mt-1">{stats.totalViews}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden group hover:border-purple-500/30 transition-all">
                    <CardContent className="p-5 md:p-6">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-purple-500/10 rounded-xl">
                                <TrendingUp className="text-purple-500" size={24} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-gray-500 text-sm font-medium">Total MCQs</h3>
                            <p className="text-2xl md:text-3xl font-bold text-white mt-1">{stats.totalQuestions}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <Card className="bg-gray-900 border-gray-800 rounded-2xl p-5 md:p-6 lg:col-span-2">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle className="text-white text-lg">Traffic Trends (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={charts.traffic}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                                    itemStyle={{ color: '#10B981' }}
                                />
                                <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="bg-gray-900 border-gray-800 rounded-2xl p-5 md:p-6">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle className="text-white text-lg">Question Difficulty</CardTitle>
                    </CardHeader>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={charts.byDifficulty}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {charts.byDifficulty.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={['#10B981', '#F59E0B', '#EF4444'][index % 3]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 text-xs">
                            {charts.byDifficulty.map((d: any, i: number) => (
                                <div key={i} className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10B981', '#F59E0B', '#EF4444'][i % 3] }} />
                                    <span className="text-gray-400 capitalize">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card className="bg-gray-900 border-gray-800 rounded-2xl p-5 md:p-6 lg:col-span-3">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle className="text-white text-lg">Questions by Subject</CardTitle>
                    </CardHeader>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.bySubject}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                                />
                                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Recent Messages */}
                <Card className="bg-gray-900 border-gray-800 rounded-2xl">
                    <CardHeader className="border-b border-gray-800 p-5 md:p-6">
                        <CardTitle className="text-lg text-white font-semibold">Latest Contact Messages</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-800">
                            {recentMessages.map((msg: any, idx: number) => (
                                <div key={msg.id ?? msg._id ?? `${msg.email ?? 'message'}-${idx}`} className="p-4 hover:bg-gray-800/50 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 shrink-0">
                                            <User size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{msg.name}</p>
                                            <p className="text-gray-500 text-xs truncate">{msg.subject}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <p className="text-gray-500 text-[10px]">{new Date(msg.createdAt).toLocaleDateString()}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-1 ${msg.status === 'unread' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'
                                            }`}>
                                            {msg.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {recentMessages.length === 0 && (
                            <div className="p-8 text-center text-gray-500 text-sm">No recent messages</div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="bg-gray-900 border-gray-800 rounded-2xl">
                    <CardHeader className="border-b border-gray-800 p-5 md:p-6">
                        <CardTitle className="text-lg text-white font-semibold">Real-time Traffic Feed</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-800">
                            {recentVisits.map((visit: any, idx: number) => (
                                <div key={visit.id ?? visit._id ?? `${visit.path ?? 'visit'}-${idx}`} className="p-4 hover:bg-gray-800/50 transition-colors flex items-center gap-4">
                                    <div className="w-2 h-2 bg-primary-green rounded-full shadow-[0_0_8px_rgba(22,163,74,0.5)] shrink-0" />
                                    <div className="flex-grow min-w-0">
                                        <p className="text-white text-sm truncate">{visit.path}</p>
                                        <p className="text-gray-500 text-[10px] font-mono">{visit.ip}</p>
                                    </div>
                                    <span className="text-gray-500 text-[10px] whitespace-nowrap shrink-0">
                                        {new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {recentVisits.length === 0 && (
                            <div className="p-8 text-center text-gray-500 text-sm">No recent activity</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
