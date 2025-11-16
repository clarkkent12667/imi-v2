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

export default function ClassCardScheduleImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<{ 
    classesCreated: number
    classesUpdated: number
    schedulesCreated: number
    studentsLinked: number
    errors: number
  } | null>(null)

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

      const response = await fetch('/api/classes/classcard-schedule-import', {
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

      setProgress({ 
        classesCreated: result.classesCreated || 0,
        classesUpdated: result.classesUpdated || 0,
        schedulesCreated: result.schedulesCreated || 0,
        studentsLinked: result.studentsLinked || 0,
        errors: result.errorCount || 0
      })
      
      if (result.errorCount > 0) {
        toast.warning(`Sync completed with ${result.errorCount} errors. ${result.classesCreated} classes created, ${result.classesUpdated} classes updated, ${result.schedulesCreated} schedules synced.`)
      } else {
        toast.success(`Successfully synced! ${result.classesCreated} classes created, ${result.classesUpdated} classes updated, ${result.schedulesCreated} schedules synced.`)
      }
      
      setTimeout(() => {
        router.push('/admin/classes')
        router.refresh()
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to import schedule')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/classes">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Sync Schedule from ClassCard</h1>
        <p className="text-muted-foreground">Sync classes and schedules from ClassCard schedule export CSV (replaces existing data)</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>ClassCard Schedule Export Sync</CardTitle>
          <CardDescription>
            Upload a ClassCard schedule list export CSV file. Only rows with Attendance Status = "Marked" will be synced. Existing classes will have their students and schedules replaced to match ClassCard exactly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">ClassCard Schedule CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                required
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                CSV format: Date, Day, Time, Class Title, Class Subject, Students, Staff, Attendance Status (from ClassCard export)
              </p>
            </div>

            {progress && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="font-semibold text-green-600">
                  ✓ {progress.classesCreated} classes created
                </p>
                {progress.classesUpdated > 0 && (
                  <p className="font-semibold text-blue-600">
                    ✓ {progress.classesUpdated} classes updated (students & schedules synced)
                  </p>
                )}
                <p className="font-semibold text-green-600">
                  ✓ {progress.schedulesCreated} schedules synced
                </p>
                <p className="font-semibold text-green-600">
                  ✓ {progress.studentsLinked} students linked to classes
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
                {isLoading ? 'Syncing...' : 'Sync Schedule'}
              </Button>
              <Link href="/admin/classes">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>

          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-2 font-semibold">ClassCard Export Format:</h3>
            <p className="text-sm text-muted-foreground mb-2">
              The CSV should have columns: <strong>Date</strong>, <strong>Day</strong>, <strong>Time</strong>, <strong>Class Title</strong>, <strong>Class Subject</strong>, <strong>Students</strong>, <strong>Staff</strong>, <strong>Attendance Status</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Important:</strong>
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Only rows where Attendance Status = "Marked" will be synced</li>
              <li>Teachers and students must already exist in the system (import them first)</li>
              <li>Subjects will be extracted from Class Title or Class Subject and matched to existing subjects</li>
              <li>Year groups will be extracted from Class Title and matched to existing year groups</li>
              <li>Classes are grouped by Class Title + Teacher</li>
              <li><strong>For existing classes:</strong> All students and schedules will be replaced to match ClassCard exactly</li>
              <li><strong>For new classes:</strong> Students and schedules will be created</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

