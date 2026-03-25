'use client'

import { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

type AuditLog = {
  id: string
  actorEmail: string
  actorRole: string
  action: string
  targetType: string | null
  targetId: string | null
  metadata: unknown
  createdAt: string
}

export default function AdminAuditLogsPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [limit, setLimit] = useState(100)

  const loadLogs = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/audit-logs?limit=${limit}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load audit logs')
      setLogs(data.logs || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load audit logs.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />
      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="font-heading text-3xl font-bold text-text-dark">Audit Logs</h1>
              <p className="text-text-light">Track admin and super admin configuration changes.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={300}
                value={limit}
                onChange={(e) => setLimit(Math.min(300, Math.max(1, Number(e.target.value) || 100)))}
                className="w-28"
              />
              <Button variant="outline" onClick={loadLogs} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Newest first. Includes actor, action, target, and timestamp.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-primary-green" size={30} />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center text-text-light py-10">No audit logs found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-text-light">
                      <tr className="border-b border-border">
                        <th className="py-2">Time</th>
                        <th className="py-2">Actor</th>
                        <th className="py-2">Action</th>
                        <th className="py-2">Target</th>
                        <th className="py-2">Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-border align-top">
                          <td className="py-3 text-text-light">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="py-3 text-text-dark">
                            <div>{log.actorEmail}</div>
                            <div className="text-xs uppercase text-text-light">{log.actorRole}</div>
                          </td>
                          <td className="py-3 text-text-dark font-medium">{log.action}</td>
                          <td className="py-3 text-text-light">
                            <div>{log.targetType || '--'}</div>
                            <div className="text-xs font-mono">{log.targetId || '--'}</div>
                          </td>
                          <td className="py-3 text-text-light max-w-md">
                            <pre className="text-xs whitespace-pre-wrap break-words">
                              {log.metadata ? JSON.stringify(log.metadata, null, 2) : '--'}
                            </pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}


