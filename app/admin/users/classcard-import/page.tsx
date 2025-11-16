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

export default function ClassCardTeachersImportPage() {
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

      const response = await fetch('/api/users/classcard-import', {
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
        toast.warning(`Import completed with ${result.errorCount} errors. ${result.successCount} teachers created.`)
      } else {
        toast.success(`Successfully imported ${result.successCount} teachers!`)
      }
      
      setTimeout(() => {
        router.push('/admin/users')
        router.refresh()
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to import teachers')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/users">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teachers
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Import Teachers from ClassCard</h1>
        <p className="text-muted-foreground">Import teachers from ClassCard staff export CSV</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>ClassCard Staff Export Import</CardTitle>
          <CardDescription>
            Upload a ClassCard staff export CSV file. Only rows with Role = "Teacher" will be imported. All teachers will be created with default password: 12345678
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">ClassCard Staff CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                required
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                CSV format: Name, Role, Email (from ClassCard export)
              </p>
            </div>

            {progress && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="font-semibold text-green-600">
                  ✓ {progress.success} teachers created successfully
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
                {isLoading ? 'Importing...' : 'Import Teachers'}
              </Button>
              <Link href="/admin/users">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>

          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-2 font-semibold">ClassCard Export Format:</h3>
            <p className="text-sm text-muted-foreground mb-2">
              The CSV should have columns: <strong>Name</strong>, <strong>Role</strong>, <strong>Email</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Only rows where Role = "Teacher" will be imported. Front Office, Administrator, and Owner roles will be skipped.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

