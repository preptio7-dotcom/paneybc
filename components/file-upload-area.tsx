'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { CloudUpload, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Subject {
  id?: string
  _id?: string
  name: string
  code: string
  chapters?: {
    name: string
    code: string
    order: number
  }[]
}

interface FileUploadAreaProps {
  allowedTypes?: string[]
  accept?: string
  title?: string
  description?: string
}

export function FileUploadArea({
  allowedTypes = ['text/plain', '.txt'],
  accept = '.txt',
  title = 'TXT',
  description = 'Text files'
}: FileUploadAreaProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [subject, setSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    fetchSubjects()
  }, [])

  useEffect(() => {
    setChapter('')
  }, [subject])

  const fetchSubjects = async () => {
    try {
      setIsLoadingSubjects(true)
      const response = await fetch('/api/admin/subjects')
      const data = await response.json()
      if (response.ok) {
        setSubjects(data.subjects || [])
      }
    } catch (error) {
      console.error('Failed to load subjects:', error)
    } finally {
      setIsLoadingSubjects(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    if (files && files[0]) {
      const isAllowed = allowedTypes.includes(files[0].type) ||
        allowedTypes.some(type => type.startsWith('.') && files[0].name.endsWith(type));

      if (isAllowed) {
        setSelectedFile(files[0])
      } else {
        toast({ title: "Invalid File", description: `Please upload a ${title} file.`, variant: "destructive" })
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !subject) {
      toast({
        title: "Missing Information",
        description: "Please select a subject and a file.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('subject', subject)
      if (chapter) {
        formData.append('chapter', chapter)
      }

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Uploaded ${data.count} questions successfully!`,
        })
        setSelectedFile(null)
        setSubject('')
        setChapter('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="border-2 border-border">
      <CardContent className="pt-8 pb-6">
        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary-green hover:bg-primary-green/5 transition-all duration-200 mb-6"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />

          <CloudUpload
            size={64}
            className="mx-auto text-primary-green mb-4 opacity-80"
          />
          <p className="text-text-dark font-medium mb-2">
            Drag {title} files here or click to browse
          </p>
          <p className="text-text-light text-sm mb-4">
            Format: number|chapterCode(optional)|question|opt1|opt2|opt3|opt4|correctIndex|explanation|difficulty
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="border-[#0F7938] text-[#0F7938] hover:bg-[#0F7938]/10"
          >
            <span>Browse Files</span>
          </Button>

          <div className="mt-6 inline-block px-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500">
            Expected {title} Line Format: <code className="text-slate-700">number|chapterCode(optional)|question|opt1|opt2|opt3|opt4|correctIndex|explanation|difficulty</code>
          </div>

          {selectedFile && (
            <p className="mt-4 text-sm text-success-green font-medium">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="subject" className="text-sm font-semibold mb-2 block">
              Select Subject
            </Label>
            <Select value={subject} onValueChange={setSubject} disabled={isLoadingSubjects}>
              <SelectTrigger id="subject">
                <SelectValue placeholder={isLoadingSubjects ? "Loading subjects..." : "Choose a subject"} />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((sub, idx) => (
                  <SelectItem key={sub.id ?? sub._id ?? `${sub.code ?? 'subject'}-${idx}`} value={sub.code}>
                    {sub.name} ({sub.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="chapter" className="text-sm font-semibold mb-2 block">
              Chapter (Optional)
            </Label>
            <Select
              value={chapter}
              onValueChange={setChapter}
              disabled={!subject}
            >
              <SelectTrigger id="chapter">
                <SelectValue placeholder={subject ? "Choose a chapter (optional)" : "Select a subject first"} />
              </SelectTrigger>
              <SelectContent>
                {(subjects.find(sub => sub.code === subject)?.chapters || []).map((ch) => (
                  <SelectItem key={ch.code} value={ch.code}>
                    {ch.name} ({ch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={isUploading || !selectedFile || !subject}
          className="w-full gap-2 bg-[#0F7938] hover:bg-[#0F7938]/90 text-white shadow-md transition-all"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Uploading...
            </>
          ) : `Upload ${title}`}
        </Button>
      </CardContent>
    </Card>
  )
}
