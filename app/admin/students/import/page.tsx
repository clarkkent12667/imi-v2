'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Upload, Download } from 'lucide-react'

export default function StudentsImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<{ success: number; errors: number } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setProgress(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setIsLoading(true)
    setProgress(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/students/bulk-import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.errors && Array.isArray(result.errors)) {
          toast.error(`Import failed: ${result.errors.slice(0, 3).join(', ')}${result.errors.length > 3 ? '...' : ''}`)
        } else {
          toast.error(result.error || 'Import failed')
        }
        return
      }

      setProgress({ success: result.successCount, errors: result.errorCount })
      
      if (result.errorCount > 0) {
        toast.warning(`Import completed with ${result.errorCount} errors. ${result.successCount} students created.`)
      } else {
        toast.success(`Successfully imported ${result.successCount} students!`)
      }
      
      // Refresh the page after a short delay
      setTimeout(() => {
        router.push('/admin/students')
        router.refresh()
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to import students')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = 'Full Name,Year Group\nJohn Doe,Year 7\nJane Smith,Year 8\nBob Johnson,Year 9'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/students">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Bulk Import Students</h1>
        <p className="text-muted-foreground">Import multiple students from a CSV file</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>CSV Import</CardTitle>
          <CardDescription>
            Upload a CSV file with columns: Full Name, Year Group. Year groups must match existing year groups in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                required
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                CSV format: Full Name, Year Group
              </p>
            </div>

            {progress && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="font-semibold text-green-600">
                  ✓ {progress.success} students created successfully
                </p>
                {progress.errors > 0 && (
                  <p className="text-sm text-destructive mt-1">
                    ✗ {progress.errors} errors occurred
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={!file || isLoading}>
                <Upload className="mr-2 h-4 w-4" />
                {isLoading ? 'Importing...' : 'Import Students'}
              </Button>
              <Button type="button" variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              <Link href="/admin/students">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>

          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-2 font-semibold">CSV Format Example:</h3>
            <pre className="text-sm overflow-x-auto">
              {`Full Name,Year Group
John Doe,Year 7
Jane Smith,Year 8
Bob Johnson,Year 9`}
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Note:</strong> Year Group names must exactly match existing year groups in the system (case-insensitive).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


