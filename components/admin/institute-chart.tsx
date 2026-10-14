'use client'

import React, { useEffect, useState } from 'react'
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'
import { Loader2, TrendingUp } from 'lucide-react'

// Beautiful dynamic colors for the bars
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#6366f1']

type InstituteData = {
    institute: string
    students: number
    rating: number
}

// Custom Tooltip component for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 text-white rounded-xl p-4 shadow-xl border border-slate-700 backdrop-blur-md">
                <p className="font-bold mb-3 border-b border-slate-700 pb-2 text-base text-slate-100">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => (
                        <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-sm font-medium" style={{ color: entry.color === '#0f172a' ? '#fde047' : entry.color }}>
                            <span>{entry.name === 'Count' ? 'Registered Students:' : 'Average Rating:'}</span>
                            <span className="font-bold">{entry.name === 'Count' ? entry.value : `⭐ ${entry.value}/5.0`}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }
    return null
}

export function InstituteAnalyticsChart() {
    const [data, setData] = useState<InstituteData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/admin/analytics/institutes')
                const json = await res.json()
                if (json.data) {
                    setData(json.data)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="h-[400px] w-full flex items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm mb-8">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="h-[400px] w-full flex items-center justify-center bg-white rounded-3xl border border-slate-200 text-slate-500 font-medium shadow-sm mb-8">
                No institute data available to visualize yet.
            </div>
        )
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 px-2 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900">Institute Distribution & Quality Assessment</h2>
                    <p className="text-sm text-slate-500 mt-1 md:mt-2">
                        A dual-axis view of student enrollments against the average trust rating per institute.
                    </p>
                </div>
                <div className="inline-flex self-start items-center gap-2 bg-emerald-50/80 border border-emerald-100 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 uppercase tracking-widest shadow-sm">
                    <TrendingUp size={16} />
                    Auto-Synced
                </div>
            </div>

            <div className="h-[430px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{ top: 20, right: 30, bottom: 85, left: 10 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="institute"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                            interval={0}
                            angle={-35}
                            textAnchor="end"
                            height={80}
                            dy={10}
                        />
                        {/* Left Axis for Student Count */}
                        <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 13 }}
                            allowDecimals={false}
                            dx={-10}
                        />
                        {/* Right Axis for 5-Star Rating Constraint */}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 13 }}
                            domain={[0, 5]}
                            dx={10}
                        />

                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

                        {/* The multi-colored Bars for Student Register Count */}
                        <Bar dataKey="students" name="Count" yAxisId="left" maxBarSize={50} radius={[8, 8, 8, 8]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>

                        {/* The Line plotting the Average Rating Quality */}
                        <Line
                            type="monotone"
                            dataKey="rating"
                            name="Rating"
                            yAxisId="right"
                            stroke="#0f172a"
                            strokeWidth={4}
                            dot={{ r: 6, fill: '#0f172a', stroke: '#ffffff', strokeWidth: 3 }}
                            activeDot={{ r: 9, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 3 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
