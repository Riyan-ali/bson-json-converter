'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, Download, Copy, FileText, Database, Moon, Sun, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import { BSON } from 'bson'

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="h-96 bg-muted animate-pulse rounded-md" />
})

type FileType = 'json' | 'bson' | null
type ConversionStatus = 'idle' | 'success' | 'error'

interface ConversionResult {
  content: string
  originalType: FileType
  convertedType: FileType
  fileName: string
}

export default function BSONJSONConverter() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [status, setStatus] = useState<ConversionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const detectFileType = (file: File): FileType => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension === 'json') return 'json'
    if (extension === 'bson') return 'bson'
    return null
  }

  const convertBSONToJSON = (buffer: ArrayBuffer): string => {
    try {
      const uint8Array = new Uint8Array(buffer)
      const document = BSON.deserialize(uint8Array)
      return JSON.stringify(document, null, 2)
    } catch (err) {
      throw new Error('Invalid BSON format')
    }
  }

  const convertJSONToBSON = (jsonString: string): Uint8Array => {
    try {
      const document = JSON.parse(jsonString)
      return BSON.serialize(document)
    } catch (err) {
      throw new Error('Invalid JSON format')
    }
  }

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setStatus('idle')

    try {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit')
      }

      const fileType = detectFileType(file)
      if (!fileType) {
        throw new Error('Unsupported file type. Please upload a .json or .bson file.')
      }

      const buffer = await file.arrayBuffer()
      let convertedContent: string
      let convertedType: FileType

      if (fileType === 'bson') {
        convertedContent = convertBSONToJSON(buffer)
        convertedType = 'json'
      } else {
        const textContent = new TextDecoder().decode(buffer)
        // Validate JSON and convert to BSON, then back to JSON for display
        convertJSONToBSON(textContent) // This validates the JSON
        convertedContent = textContent
        convertedType = 'bson'
      }

      const result: ConversionResult = {
        content: convertedContent,
        originalType: fileType,
        convertedType,
        fileName: file.name.replace(/\.[^/.]+$/, '') // Remove extension
      }

      setConversionResult(result)
      setEditorContent(convertedContent)
      setStatus('success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during conversion'
      setError(errorMessage)
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      setFile(droppedFile)
      processFile(droppedFile)
    }
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      processFile(selectedFile)
    }
  }, [processFile])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editorContent)
      setIsCopied(true)
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const downloadFile = () => {
    if (!conversionResult) return

    let blob: Blob
    let fileName: string

    if (conversionResult.convertedType === 'json') {
      blob = new Blob([editorContent], { type: 'application/json' })
      fileName = `${conversionResult.fileName}.json`
    } else {
      try {
        const bsonData = convertJSONToBSON(editorContent)
        blob = new Blob([bsonData], { type: 'application/octet-stream' })
        fileName = `${conversionResult.fileName}.bson`
      } catch (err) {
        setError('Invalid JSON format for BSON conversion')
        return
      }
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          {/* Theme toggle - top right on mobile, integrated on desktop */}
          <div className="flex justify-end mb-4 md:hidden">
            {mounted && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
          </div>
          
          {/* Main header content */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4 md:mb-0">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Database className="h-8 w-8 text-primary" />
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold">BSON ↔ JSON Converter</h1>
                <p className="text-sm md:text-base text-muted-foreground">Convert between BSON and JSON formats with ease</p>
              </div>
            </div>
            
            {/* Theme toggle - hidden on mobile, shown on desktop */}
            <div className="hidden md:block">
              {mounted && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-4xl">
                    <Database className="h-12 w-12 text-muted-foreground" />
                    <span className="text-muted-foreground">↔</span>
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">Drop your file here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supports .json and .bson files (max 10MB)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Choose File'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.bson"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {status === 'success' && conversionResult && (
                <Alert className="mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully converted {conversionResult.originalType?.toUpperCase()} to{' '}
                    {conversionResult.convertedType?.toUpperCase()}
                  </AlertDescription>
                </Alert>
              )}

              {file && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editor Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Editor
                  {conversionResult && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({conversionResult.convertedType?.toUpperCase()})
                    </span>
                  )}
                </CardTitle>
                {conversionResult && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={isCopied}>
                      {isCopied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadFile}>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-96 border rounded-md overflow-hidden">
                <MonacoEditor
                  height="100%"
                  language="json"
                  theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                  value={editorContent}
                  onChange={(value) => setEditorContent(value || '')}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollbar: {
                      vertical: 'visible',
                      horizontal: 'visible'
                    },
                    wordWrap: 'on',
                    automaticLayout: true
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">BSON Support</h3>
                <p className="text-sm text-muted-foreground">
                  Binary JSON format used by MongoDB
                </p>
              </div>
              <div>
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">JSON Support</h3>
                <p className="text-sm text-muted-foreground">
                  Standard JSON format with syntax highlighting
                </p>
              </div>
              <div>
                <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Easy Upload</h3>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to upload files up to 10MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
