'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react'

type PaymentMethod = {
  id: string
  type: 'nayapay' | 'easypaisa' | 'bank_account'
  displayName: string
  isActive: boolean
  accountTitle?: string
  accountNumberOrId?: string
  additionalInfo?: Record<string, any>
  displayOrder: number
}

type FormData = {
  type: 'nayapay' | 'easypaisa' | 'bank_account'
  displayName: string
  accountTitle: string
  accountNumberOrId: string
  nayapayId: string
  bankName: string
  isActive: boolean
  displayOrder: number
}

export default function PaymentMethodsPage() {
  const { toast } = useToast()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    type: 'nayapay',
    displayName: '',
    accountTitle: '',
    accountNumberOrId: '',
    nayapayId: '',
    bankName: '',
    isActive: true,
    displayOrder: 0,
  })

  const loadMethods = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/payment-methods')
      if (!response.ok) throw new Error('Failed to load payment methods')
      const data = await response.json()
      setMethods(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load payment methods',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMethods()
  }, [])

  const resetForm = () => {
    setFormData({
      type: 'nayapay',
      displayName: '',
      accountTitle: '',
      accountNumberOrId: '',
      nayapayId: '',
      bankName: '',
      isActive: true,
      displayOrder: methods.length,
    })
    setEditingId(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (method: PaymentMethod) => {
    setFormData({
      type: method.type,
      displayName: method.displayName,
      accountTitle: method.accountTitle || '',
      accountNumberOrId: method.accountNumberOrId || '',
      nayapayId: method.additionalInfo?.nayapayId || '',
      bankName: method.additionalInfo?.bankName || '',
      isActive: method.isActive,
      displayOrder: method.displayOrder,
    })
    setEditingId(method.id)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.displayName.trim()) {
      toast({
        title: 'Missing field',
        description: 'Please enter a display name',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSaving(true)

      const additionalInfo: Record<string, any> = {}
      if (formData.type === 'nayapay' && formData.nayapayId) {
        additionalInfo.nayapayId = formData.nayapayId
      }
      if (formData.type === 'bank_account' && formData.bankName) {
        additionalInfo.bankName = formData.bankName
      }

      const payload = {
        type: formData.type,
        displayName: formData.displayName,
        accountTitle: formData.accountTitle || null,
        accountNumberOrId: formData.accountNumberOrId || null,
        additionalInfo: Object.keys(additionalInfo).length > 0 ? additionalInfo : null,
        isActive: formData.isActive,
        displayOrder: formData.displayOrder,
      }

      const method = editingId ? 'PATCH' : 'POST'
      const url = editingId ? `/api/admin/payment-methods/${editingId}` : '/api/admin/payment-methods'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast({
        title: 'Success',
        description: editingId ? 'Payment method updated' : 'Payment method created',
      })

      setIsDialogOpen(false)
      await loadMethods()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (methodId: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return

    try {
      setIsDeletingId(methodId)
      const response = await fetch(`/api/admin/payment-methods/${methodId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete')
      }

      toast({
        title: 'Deleted',
        description: 'Payment method deleted successfully',
      })

      await loadMethods()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsDeletingId(null)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'nayapay': return '💳'
      case 'easypaisa': return '📱'
      case 'bank_account': return '🏦'
      default: return '💰'
    }
  }

  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[72px] lg:pt-[80px] pb-12">
        <div className="max-w-4xl mx-auto px-4 md:px-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-text-dark">Payment Methods</h1>
              <p className="text-text-light">Configure payment options for subscriptions</p>
            </div>
            <Link href="/admin">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>

          {/* Info Alert */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Super Admin Only</p>
                <p>Configure all available payment methods that users can use when purchasing subscriptions. Only active methods will appear to users.</p>
              </div>
            </CardContent>
          </Card>

          {/* Create Button */}
          <div>
            <Button onClick={openCreateDialog} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Payment Method
            </Button>
          </div>

          {/* Payment Methods List */}
          {isLoading ? (
            <Card>
              <CardContent className="py-12 flex items-center justify-center">
                <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
              </CardContent>
            </Card>
          ) : methods.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-text-light">
                No payment methods configured yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {methods.map((method) => (
                <Card key={method.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getTypeIcon(method.type)}</span>
                          <div>
                            <h3 className="font-semibold text-text-dark">{method.displayName}</h3>
                            <p className="text-xs text-text-light capitalize">
                              {method.type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mt-3 ml-11">
                          {method.accountTitle && (
                            <div>
                              <span className="text-text-light">Account:</span>
                              <p className="font-mono text-text-dark">{method.accountTitle}</p>
                            </div>
                          )}
                          {method.accountNumberOrId && (
                            <div>
                              <span className="text-text-light">Account #:</span>
                              <p className="font-mono text-text-dark">{method.accountNumberOrId}</p>
                            </div>
                          )}
                        </div>

                        {method.additionalInfo && Object.keys(method.additionalInfo).length > 0 && (
                          <div className="mt-3 ml-11 text-xs text-text-light">
                            {method.additionalInfo.nayapayId && (
                              <p>Nayapay ID: <span className="font-mono text-text-dark">{method.additionalInfo.nayapayId}</span></p>
                            )}
                            {method.additionalInfo.bankName && (
                              <p>Bank: <span className="font-mono text-text-dark">{method.additionalInfo.bankName}</span></p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${method.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {method.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(method)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isDeletingId === method.id}
                            onClick={() => handleDelete(method.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Order Info */}
          {methods.length > 1 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6 text-sm text-amber-900">
                <p>💡 Payment methods are displayed to users in order. Edit methods to change their display order.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Payment Method' : 'Add Payment Method'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update payment method details'
                : 'Create a new payment method for subscriptions'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type Selection */}
            <div>
              <Label htmlFor="payment-type">Payment Type</Label>
              <Select value={formData.type} onValueChange={(val: any) => setFormData(prev => ({...prev, type: val}))}>
                <SelectTrigger id="payment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nayapay">Nayapay</SelectItem>
                  <SelectItem value="easypaisa">Easypaisa</SelectItem>
                  <SelectItem value="bank_account">Bank Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Display Name */}
            <div>
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                placeholder="e.g., Preptio Nayapay Account"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              />
            </div>

            {/* Account Title */}
            <div>
              <Label htmlFor="account-title">Account Title / Owner Name</Label>
              <Input
                id="account-title"
                placeholder="e.g., Preptio Inc."
                value={formData.accountTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, accountTitle: e.target.value }))}
              />
            </div>

            {/* Type-Specific Fields */}
            {formData.type === 'nayapay' && (
              <div>
                <Label htmlFor="nayapay-id">Nayapay Account ID</Label>
                <Input
                  id="nayapay-id"
                  placeholder="Your Nayapay account identifier"
                  value={formData.nayapayId}
                  onChange={(e) => setFormData(prev => ({ ...prev, nayapayId: e.target.value }))}
                />
              </div>
            )}

            {formData.type === 'easypaisa' && (
              <div>
                <Label htmlFor="easypaisa-number">Easypaisa Account Number</Label>
                <Input
                  id="easypaisa-number"
                  placeholder="e.g., 03001234567"
                  value={formData.accountNumberOrId}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumberOrId: e.target.value }))}
                />
              </div>
            )}

            {formData.type === 'bank_account' && (
              <>
                <div>
                  <Label htmlFor="bank-name">Bank Name</Label>
                  <Input
                    id="bank-name"
                    placeholder="e.g., HBL"
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="bank-account">Bank Account Number</Label>
                  <Input
                    id="bank-account"
                    placeholder="Your bank account number"
                    value={formData.accountNumberOrId}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumberOrId: e.target.value }))}
                  />
                </div>
              </>
            )}

            {/* Display Order */}
            <div>
              <Label htmlFor="display-order">Display Order</Label>
              <Input
                id="display-order"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                min="0"
              />
              <p className="text-xs text-text-light mt-1">Lower numbers appear first</p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="is-active" className="mb-0">Active</Label>
              <Switch
                id="is-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
