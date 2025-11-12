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

export default function TaxonomyImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/taxonomy/import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      toast.success(result.message || 'Import successful')
      router.push('/admin/taxonomy')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to import taxonomy')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/taxonomy">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Taxonomy
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Bulk Import Taxonomy</h1>
        <p className="text-muted-foreground">Import taxonomy data from a CSV file</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>CSV Import</CardTitle>
          <CardDescription>
            Upload a CSV file with columns: Qualification, Exam Board, Subject, Topic (optional), Subtopic (optional)
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
              />
              <p className="text-sm text-muted-foreground">
                CSV format: Qualification, Exam Board, Subject, Topic, Subtopic
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={!file || isLoading}>
                <Upload className="mr-2 h-4 w-4" />
                {isLoading ? 'Importing...' : 'Import'}
              </Button>
              <Link href="/admin/taxonomy">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>

          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-2 font-semibold">CSV Format Example:</h3>
            <pre className="text-sm">
              {`Qualification,Exam Board,Subject,Topic,Subtopic
GCSE,AQA,Mathematics,Algebra,Linear Equations
GCSE,AQA,Mathematics,Algebra,Quadratic Equations
GCSE,Edexcel,Mathematics,Geometry,Circles`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

