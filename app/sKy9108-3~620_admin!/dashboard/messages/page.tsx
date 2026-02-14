'use client'

import React, { useEffect, useState } from 'react'
import {
    Mail,
    User,
    Calendar,
    Search,
    Filter,
    Reply,
    CheckCircle2,
    Clock,
    MoreVertical,
    Send,
    Loader2,
    ChevronRight,
    MessageSquare,
    ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

export default function MessageInbox() {
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'replied'>('all')
    const [selectedMessage, setSelectedMessage] = useState<any>(null)
    const [replyText, setReplyText] = useState('')
    const [isSending, setIsSending] = useState(false)

    useEffect(() => {
        fetchMessages()
    }, [])

    const fetchMessages = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/contacts')
            const data = await response.json()
            if (response.ok) {
                setMessages(data.messages)
            } else {
                throw new Error(data.error || 'Failed to fetch messages')
            }
        } catch (error: any) {
            toast.error('Error', { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    const handleReply = async () => {
        if (!replyText.trim()) return

        setIsSending(true)
        try {
            const response = await fetch('/api/admin/contacts/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId: selectedMessage._id,
                    replyText,
                }),
            })

            if (response.ok) {
                toast.success('Reply Sent!', {
                    description: `Your response has been emailed to ${selectedMessage.email}`,
                })
                setReplyText('')
                setSelectedMessage(null)
                fetchMessages() // Refresh list
            } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to send reply')
            }
        } catch (error: any) {
            toast.error('Error', { description: error.message })
        } finally {
            setIsSending(false)
        }
    }

    const filteredMessages = messages.filter(msg => {
        const matchesSearch =
            msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.subject.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'all' || msg.status === statusFilter

        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Support Inbox</h1>
                    <p className="text-gray-400 mt-2">Manage and reply to user inquiries from across the site.</p>
                </div>
                <div className="text-left md:text-right">
                    <p className="text-sm text-gray-500">Total Conversations</p>
                    <p className="text-2xl font-bold text-white">{messages.length}</p>
                </div>
            </div>

            <Card className="bg-gray-900 border-gray-800 rounded-2xl">
                <CardHeader className="p-6 border-b border-gray-800">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <Input
                                placeholder="Search by name, email, or subject..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white pl-10 h-10 rounded-xl"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            {(['all', 'new', 'replied'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setStatusFilter(filter)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${statusFilter === filter
                                        ? 'bg-primary-green text-gray-950 shadow-lg shadow-primary-green/20'
                                        : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <Loader2 className="animate-spin text-primary-green" size={40} />
                            <p className="text-gray-500 font-medium">Loading inbox...</p>
                        </div>
                    ) : filteredMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
                            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center text-gray-600">
                                <Mail size={32} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Empty Inbox</h3>
                                <p className="text-gray-500 max-w-xs">No messages found matching your current filters.</p>
                            </div>
                            {(searchTerm || statusFilter !== 'all') && (
                                <Button
                                    variant="outline"
                                    onClick={() => { setSearchTerm(''); setStatusFilter('all') }}
                                    className="border-gray-700 text-gray-400 hover:bg-gray-800"
                                >
                                    Clear all filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                            {filteredMessages.map((msg, idx) => (
                                <div
                                    key={msg._id ?? `${msg.email ?? 'message'}-${msg.createdAt ?? idx}`}
                                    className={`p-6 hover:bg-gray-800/40 transition-colors group relative cursor-pointer ${msg.status === 'new' ? 'bg-primary-green/[0.02]' : ''
                                        }`}
                                    onClick={() => setSelectedMessage(msg)}
                                >
                                    {msg.status === 'new' && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-green" />
                                    )}
                                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${msg.status === 'new' ? 'bg-primary-green text-gray-950' : 'bg-gray-800 text-gray-400'
                                                }`}>
                                                {msg.name[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-white font-bold">{msg.name}</h3>
                                                    {msg.status === 'replied' && (
                                                        <span className="flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                            <Reply size={10} />
                                                            Replied
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-500 text-sm font-medium">{msg.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex-grow md:max-w-md lg:max-w-xl">
                                            <p className="text-white font-semibold line-clamp-1">{msg.subject}</p>
                                            <p className="text-gray-400 text-sm line-clamp-1 mt-0.5">{msg.message}</p>
                                        </div>
                                        <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 w-full md:w-auto text-right">
                                            <p className="text-gray-500 text-xs font-mono">
                                                {new Date(msg.createdAt).toLocaleDateString()}
                                            </p>
                                            <div className="flex items-center gap-2 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-green hover:bg-primary-green/10">
                                                    <Reply size={16} />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:bg-gray-800">
                                                    <MoreVertical size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reply Dialog */}
            <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
                <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 text-white rounded-3xl p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-6 border-b border-gray-800 bg-gray-900/50">
                        <DialogTitle className="text-xl font-bold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary-green/20 rounded-lg flex items-center justify-center text-primary-green">
                                    <MessageSquare size={18} />
                                </div>
                                Conversation Details
                            </span>
                            <div className="flex items-center gap-2">
                                {selectedMessage?.status === 'replied' ? (
                                    <span className="flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                                        Replied
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] bg-primary-green/10 text-primary-green px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                                        Pending
                                    </span>
                                )}
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="p-6 space-y-6">
                            {/* User Info & Original Message */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center font-bold text-gray-400">
                                        {selectedMessage?.name?.[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{selectedMessage?.name}</h4>
                                        <p className="text-gray-500 text-sm flex items-center gap-2">
                                            <Mail size={14} />
                                            {selectedMessage?.email}
                                        </p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-gray-500 text-xs font-mono">
                                            <Calendar size={12} className="inline mr-1" />
                                            {selectedMessage && new Date(selectedMessage.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-800/50 border border-gray-800 rounded-2xl p-6">
                                    <h5 className="text-primary-green text-xs font-bold uppercase tracking-widest mb-3">User Inquiry</h5>
                                    <p className="text-white font-bold text-lg mb-2">{selectedMessage?.subject}</p>
                                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedMessage?.message}</p>
                                </div>
                            </div>

                            {/* Previous Reply if any */}
                            {selectedMessage?.status === 'replied' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-blue-500">
                                        <Reply size={18} />
                                        <h5 className="text-xs font-bold uppercase tracking-widest">Your Admin Support Reply</h5>
                                        <span className="text-gray-500 text-[10px] ml-auto">
                                            {new Date(selectedMessage.replyAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6">
                                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedMessage?.reply}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className="text-gray-500 text-xs hover:text-white hover:bg-gray-800"
                                        onClick={() => setReplyText(selectedMessage.reply)}
                                    >
                                        Edit/Resend Reply
                                    </Button>
                                </div>
                            )}

                            {/* Reply Input Area */}
                            <div className="space-y-4 pt-4 border-t border-gray-800">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                                        Draft Your Reply
                                    </h5>
                                    <p className="text-[10px] text-gray-500 italic">User will receive this via email</p>
                                </div>
                                <Textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your response to the user here..."
                                    className="bg-gray-800 border-gray-700 text-white min-h-[150px] resize-none focus:ring-primary-green rounded-2xl p-4 leading-relaxed"
                                />
                                <div className="flex gap-4">
                                    <Button
                                        onClick={() => setSelectedMessage(null)}
                                        variant="ghost"
                                        className="flex-1 h-12 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl"
                                    >
                                        Close Conversation
                                    </Button>
                                    <Button
                                        onClick={handleReply}
                                        disabled={!replyText.trim() || isSending}
                                        className="flex-1 h-12 bg-primary-green hover:bg-primary-green/90 text-gray-950 font-bold rounded-xl gap-2 active:scale-95 transition-all"
                                    >
                                        {isSending ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                Sending Email...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Send Support Email
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
