'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { FileUploadArea } from './file-upload-area'
import { TextInputArea } from './text-input-area'
import { FileJson, PenSquare as PencilSquare } from 'lucide-react'

export function UploadTabs() {
  const [activeTab, setActiveTab] = useState('txt')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="txt" className="gap-2">
          <FileJson size={16} />
          <span className="hidden sm:inline">Upload TXT</span>
        </TabsTrigger>
        <TabsTrigger value="text" className="gap-2">
          <PencilSquare size={16} />
          <span className="hidden sm:inline">Direct Input</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="txt">
        <FileUploadArea
          allowedTypes={['text/plain', '.txt']}
          accept=".txt"
          title="TXT"
        />
      </TabsContent>

      <TabsContent value="text">
        <TextInputArea />
      </TabsContent>
    </Tabs>
  )
}
