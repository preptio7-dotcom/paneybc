'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'

interface Note {
  id?: string
  _id?: string
  title: string
  content: string
  subject?: string
  chapter?: string
}

interface Flashcard {
  id?: string
  _id?: string
  front: string
  back: string
  subject?: string
  chapter?: string
}

export default function NotesPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [authToastShown, setAuthToastShown] = useState(false)
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards'>('notes')
  const [notes, setNotes] = useState<Note[]>([])
  const [cards, setCards] = useState<Flashcard[]>([])
  const [notesPage, setNotesPage] = useState(1)
  const [cardsPage, setCardsPage] = useState(1)
  const notesPageSize = 5
  const cardsPageSize = 5

  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteTitle, setEditNoteTitle] = useState('')
  const [editNoteContent, setEditNoteContent] = useState('')
  const [cardFront, setCardFront] = useState('')
  const [cardBack, setCardBack] = useState('')
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editCardFront, setEditCardFront] = useState('')
  const [editCardBack, setEditCardBack] = useState('')

  const loadNotes = async () => {
    const response = await fetch('/api/notes')
    if (response.ok) {
      const data = await response.json()
      setNotes(data.notes || [])
    }
  }

  const loadCards = async () => {
    const response = await fetch('/api/flashcards')
    if (response.ok) {
      const data = await response.json()
      setCards(data.cards || [])
    }
  }

  useEffect(() => {
    if (authLoading || !user) return
    loadNotes()
    loadCards()
  }, [authLoading, user])

  useEffect(() => {
    if (!authLoading && !user && !authToastShown) {
      toast({
        title: 'Login required',
        description: 'Please log in to access your notes.',
        variant: 'destructive',
      })
      setAuthToastShown(true)
    }
  }, [authLoading, user, authToastShown, toast])

  const handleAddNote = async () => {
    if (!noteTitle || !noteContent) return
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: noteTitle, content: noteContent }),
    })
    if (response.ok) {
      setNoteTitle('')
      setNoteContent('')
      loadNotes()
    }
  }

  const handleAddCard = async () => {
    if (!cardFront || !cardBack) return
    const response = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ front: cardFront, back: cardBack }),
    })
    if (response.ok) {
      setCardFront('')
      setCardBack('')
      loadCards()
    }
  }

  const handleDeleteNote = async (id: string) => {
    const response = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    if (response.ok) loadNotes()
  }

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id ?? note._id ?? null)
    setEditNoteTitle(note.title || '')
    setEditNoteContent(note.content || '')
  }

  const handleSaveNoteEdit = async () => {
    if (!editingNoteId || !editNoteTitle || !editNoteContent) return
    const response = await fetch('/api/notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingNoteId,
        title: editNoteTitle,
        content: editNoteContent,
      }),
    })
    if (response.ok) {
      setEditingNoteId(null)
      setEditNoteTitle('')
      setEditNoteContent('')
      loadNotes()
    }
  }

  const handleCancelNoteEdit = () => {
    setEditingNoteId(null)
    setEditNoteTitle('')
    setEditNoteContent('')
  }

  const handleDeleteCard = async (id: string) => {
    const response = await fetch(`/api/flashcards?id=${id}`, { method: 'DELETE' })
    if (response.ok) loadCards()
  }

  const handleEditCard = (card: Flashcard) => {
    setEditingCardId(card.id ?? card._id ?? null)
    setEditCardFront(card.front || '')
    setEditCardBack(card.back || '')
  }

  const handleSaveCardEdit = async () => {
    if (!editingCardId || !editCardFront || !editCardBack) return
    const response = await fetch('/api/flashcards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingCardId,
        front: editCardFront,
        back: editCardBack,
      }),
    })
    if (response.ok) {
      setEditingCardId(null)
      setEditCardFront('')
      setEditCardBack('')
      setIsFlipped(false)
      loadCards()
    }
  }

  const handleCancelCardEdit = () => {
    setEditingCardId(null)
    setEditCardFront('')
    setEditCardBack('')
  }

  useEffect(() => {
    if (cards.length === 0) {
      setActiveCardIndex(0)
      setIsFlipped(false)
      return
    }
    if (activeCardIndex >= cards.length) {
      setActiveCardIndex(0)
      setIsFlipped(false)
    }
  }, [cards, activeCardIndex])

  useEffect(() => {
    setActiveCardIndex(0)
    setIsFlipped(false)
  }, [cardsPage])

  const totalNotesPages = Math.max(1, Math.ceil(notes.length / notesPageSize))
  const totalCardsPages = Math.max(1, Math.ceil(cards.length / cardsPageSize))
  const pagedNotes = notes.slice((notesPage - 1) * notesPageSize, notesPage * notesPageSize)
  const pagedCards = cards.slice((cardsPage - 1) * cardsPageSize, cardsPage * cardsPageSize)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="animate-spin text-primary-green">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-text-dark font-semibold">Login required</p>
            <p className="text-text-light text-sm">Please log in to access notes and flashcards.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="pt-20 md:pt-28 pb-16 px-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="font-heading text-3xl font-bold text-text-dark">Notes & Flashcards</h1>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === 'notes' ? 'default' : 'outline'} onClick={() => setActiveTab('notes')}>
            Notes
          </Button>
          <Button variant={activeTab === 'flashcards' ? 'default' : 'outline'} onClick={() => setActiveTab('flashcards')}>
            Flashcards
          </Button>
        </div>

        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-heading text-xl font-bold">Create Note</h2>
                <Input placeholder="Title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
                <Textarea rows={6} placeholder="Write your note..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
                <Button onClick={handleAddNote}>Save Note</Button>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-heading text-xl font-bold">Saved Notes</h2>
                {notes.length === 0 && <p className="text-sm text-text-light">No notes yet.</p>}
                <div className="space-y-3">
                  {pagedNotes.map((note, idx) => (
                    <div key={note.id ?? note._id ?? `${note.title ?? 'note'}-${idx}`} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{note.title}</h3>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditNote(note)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteNote(note.id ?? note._id)}>Delete</Button>
                        </div>
                      </div>
                      {editingNoteId === (note.id ?? note._id) ? (
                        <div className="space-y-2 mt-3">
                          <Input value={editNoteTitle} onChange={(e) => setEditNoteTitle(e.target.value)} />
                          <Textarea rows={4} value={editNoteContent} onChange={(e) => setEditNoteContent(e.target.value)} />
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleSaveNoteEdit}>Save</Button>
                            <Button size="sm" variant="outline" onClick={handleCancelNoteEdit}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-text-light whitespace-pre-line">{note.content}</p>
                      )}
                    </div>
                  ))}
                </div>
                {notes.length > notesPageSize && (
                  <div className="flex items-center justify-between pt-3">
                    <div className="text-xs text-text-light">Page {notesPage} of {totalNotesPages}</div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={notesPage <= 1}
                        onClick={() => setNotesPage((prev) => Math.max(1, prev - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={notesPage >= totalNotesPages}
                        onClick={() => setNotesPage((prev) => Math.min(totalNotesPages, prev + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'flashcards' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-heading text-xl font-bold">Create Flashcard</h2>
                <Input placeholder="Front" value={cardFront} onChange={(e) => setCardFront(e.target.value)} />
                <Textarea rows={4} placeholder="Back" value={cardBack} onChange={(e) => setCardBack(e.target.value)} />
                <Button onClick={handleAddCard}>Save Card</Button>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-heading text-xl font-bold">Study Flashcards</h2>
                {cards.length === 0 && <p className="text-sm text-text-light">No flashcards yet.</p>}
                {pagedCards.length > 0 && (
                  <>
                    <div className="flex items-center justify-between text-xs text-text-light">
                      <span>Card {activeCardIndex + 1} of {pagedCards.length}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditCard(pagedCards[activeCardIndex])}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCard(pagedCards[activeCardIndex].id ?? pagedCards[activeCardIndex]._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-light">
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-primary-green animate-pulse" />
                        Tap the card to flip
                      </span>
                      <span>{isFlipped ? 'Back side' : 'Front side'}</span>
                    </div>
                    <div className="w-full" style={{ perspective: '1000px' }}>
                      <button
                        type="button"
                        onClick={() => setIsFlipped((prev) => !prev)}
                        className="w-full text-left"
                        aria-label="Flip flashcard"
                      >
                        <div
                          className="relative h-56 rounded-2xl border border-border shadow-sm transition-transform duration-500"
                          style={{
                            transformStyle: 'preserve-3d',
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          }}
                        >
                          <div
                            className="absolute inset-0 rounded-2xl bg-white p-6 flex items-center justify-center text-center"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <div className="flex flex-col items-center gap-3">
                              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Front</span>
                              <p className="text-lg font-semibold text-text-dark">
                              {pagedCards[activeCardIndex].front}
                              </p>
                              <span className="text-xs text-slate-400">Tap to reveal answer</span>
                            </div>
                          </div>
                          <div
                            className="absolute inset-0 rounded-2xl bg-slate-50 p-6 flex items-center justify-center text-center"
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                          >
                            <div className="flex flex-col items-center gap-3">
                              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Back</span>
                              <p className="text-base text-text-dark whitespace-pre-line">
                                {pagedCards[activeCardIndex].back}
                              </p>
                              <span className="text-xs text-slate-400">Tap to see question</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsFlipped(false)
                          setActiveCardIndex((prev) => (prev - 1 + pagedCards.length) % pagedCards.length)
                        }}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setIsFlipped(false)
                          setActiveCardIndex((prev) => (prev + 1) % pagedCards.length)
                        }}
                      >
                        Next
                      </Button>
                    </div>
                    {editingCardId === (pagedCards[activeCardIndex].id ?? pagedCards[activeCardIndex]._id) && (
                      <div className="space-y-2 pt-4 border-t border-border">
                        <Input value={editCardFront} onChange={(e) => setEditCardFront(e.target.value)} placeholder="Front" />
                        <Textarea rows={3} value={editCardBack} onChange={(e) => setEditCardBack(e.target.value)} placeholder="Back" />
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={handleSaveCardEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={handleCancelCardEdit}>Cancel</Button>
                        </div>
                      </div>
                    )}
                    {cards.length > cardsPageSize && (
                      <div className="flex items-center justify-between text-xs text-text-light">
                        <span>Page {cardsPage} of {totalCardsPages}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={cardsPage <= 1}
                            onClick={() => setCardsPage((prev) => Math.max(1, prev - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={cardsPage >= totalCardsPages}
                            onClick={() => setCardsPage((prev) => Math.min(totalCardsPages, prev + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-3 pt-4 border-t border-border">
                      <h3 className="text-sm font-semibold text-text-dark">Saved Cards</h3>
                      {pagedCards.map((card, index) => (
                        <button
                          key={card.id ?? card._id ?? `${card.front ?? 'card'}-${index}`}
                          type="button"
                          onClick={() => {
                            setActiveCardIndex(index)
                            setIsFlipped(false)
                          }}
                          className={`w-full text-left border rounded-lg p-3 transition-colors ${
                            index === activeCardIndex ? 'border-primary-green bg-primary-green/5' : 'border-border'
                          }`}
                        >
                          <p className="font-semibold">{card.front}</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
