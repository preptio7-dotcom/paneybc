'use client'

import React, { useEffect, useState } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts'
import {
    Calendar,
    TrendingUp,
    Users,
    MousePointer2,
    Globe,
    Smartphone,
    Layout,
    ArrowUpRight,
    Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const COLORS = ['#16a34a', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899']

export default function AnalyticsPage() {
    const [range, setRange] = useState('7')
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/analytics?days=${range}`)
            .then(res => res.json())
            .then(json => {
                setData(json)
                setLoading(false)
            })
            .catch(err => {
                console.error('Failed to load analytics:', err)
                setLoading(false)
            })
    }, [range])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-primary-green" size={48} />
            </div>
        )
    }

    const { visitsByDay, popularPages, deviceDist } = data

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Traffic Analytics</h1>
                    <p className="text-gray-400 mt-2">Deep dive into visitor behavior and platform performance.</p>
                </div>
                <div className="flex items-center gap-3 bg-gray-900 p-1.5 rounded-xl border border-gray-800">
                    <Calendar className="text-gray-500 ml-2" size={18} />
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="w-[180px] bg-transparent border-none text-white focus:ring-0">
                            <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800 text-white">
                            <SelectItem value="1">Last 24 Hours</SelectItem>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 3 Months</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Traffic Overview */}
            <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="text-primary-green" size={20} />
                        Visitor Traffic
                    </CardTitle>
                    <CardDescription className="text-gray-500">Total page views over the selected time period.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={visitsByDay}>
                            <defs>
                                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#6b7280"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(str) => {
                                    const date = new Date(str)
                                    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                                }}
                            />
                            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                                itemStyle={{ color: '#16a34a' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#16a34a"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorVisits)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Popular Content */}
                <Card className="lg:col-span-2 bg-gray-900 border-gray-800 rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Layout className="text-blue-500" size={20} />
                            Most Visited Pages
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-800">
                            {popularPages.map((page: any, index: number) => (
                                <div key={page.path} className="p-4 flex items-center justify-between hover:bg-gray-800/50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-mono text-gray-500">0{index + 1}</span>
                                        <span className="text-sm text-white font-medium">{page.path}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-400">{page.count} views</span>
                                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500"
                                                style={{ width: `${(page.count / popularPages[0].count) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Device Distribution */}
                <Card className="bg-gray-900 border-gray-800 rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Smartphone className="text-secondary-gold" size={20} />
                            Device Usage
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center p-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deviceDist}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {deviceDist.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-xs text-gray-500">Top Device</span>
                            <span className="text-lg font-bold text-white">{deviceDist[0]?.name || 'N/A'}</span>
                        </div>
                    </CardContent>
                    <div className="px-6 pb-6 space-y-3">
                        {deviceDist.map((item: any, index: number) => (
                            <div key={item.name} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-gray-400">{item.name}</span>
                                </div>
                                <span className="text-white font-medium">{item.value} visits</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    )
}
