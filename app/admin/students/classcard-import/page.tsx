'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Upload } from 'lucide-react'

export default function ClassCardStudentsImportPage() {
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

      const response = await fetch('/api/students/classcard-import', {
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/students">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Import Students from ClassCard</h1>
        <p className="text-muted-foreground">Import active students from ClassCard student export CSV</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>ClassCard Students Export Import</CardTitle>
          <CardDescription>
            Upload a ClassCard students export CSV file. Only rows with Status = "Active" will be imported.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">ClassCard Students CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                required
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                CSV format: Name, Status, Current Year Group (from ClassCard export)
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
              <Link href="/admin/students">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>

          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-2 font-semibold">ClassCard Export Format:</h3>
            <p className="text-sm text-muted-foreground mb-2">
              The CSV should have columns: <strong>Name</strong>, <strong>Status</strong>, <strong>Current Year Group</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Only rows where Status = "Active" will be imported. Year groups will be automatically extracted and matched (e.g., "Year 10 / Grade 9" → "Y10" or "Year 10").
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

