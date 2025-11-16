'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Database, Trash2 } from 'lucide-react'

export default function PopulateSampleDataButton() {
  const [isPopulating, setIsPopulating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handlePopulate = async () => {
    if (isPopulating || isRemoving) return

    if (!confirm('This will create test data:\n- 40 students (10 per year group Year 10-13)\n- Classes based on existing taxonomy subjects\n- Teachers assigned to classes\n- Work records for all students (5 per student)\n- Data spread across multiple subjects and year groups for analytics\n\nNote: Requires taxonomy data (qualifications, exam boards, subjects) to exist.\n\nContinue?')) {
      return
    }

    setIsPopulating(true)
    setProgress(0)
    setCurrentStep('Starting...')
    setShowProgressDialog(true)
    setResults(null)

    try {
      const response = await fetch('/api/populate-sample-data', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to start population')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.progress !== undefined) {
                setProgress(data.progress)
              }
              
              if (data.step) {
                setCurrentStep(data.step)
              }

              if (data.success !== undefined) {
                // Final result
                setResults(data)
                setProgress(100)
                setCurrentStep('Complete!')
                
                toast.success(
                  `Sample data created successfully!`,
                  {
                    description: `${data.studentsCreated} students, ${data.classesCreated} classes, ${data.workRecordsCreated} work records`,
                  }
                )

                // Close dialog and refresh after a delay
                setTimeout(() => {
                  setShowProgressDialog(false)
                  window.location.reload()
                }, 2000)
              }

              if (data.error) {
                throw new Error(data.error)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error populating sample data:', error)
      toast.error('Failed to populate sample data', {
        description: error.message || 'An error occurred',
      })
      setShowProgressDialog(false)
    } finally {
      setIsPopulating(false)
    }
  }

  const handleRemove = async () => {
    if (isPopulating || isRemoving) return

    if (!confirm('This will DELETE all test data:\n- Test students (40 students)\n- Test classes (4 classes)\n- Work records for test data\n\nNote: Teachers (Shayan, Bilal, Lakshmi, Asif) will NOT be deleted.\n\nThis action cannot be undone!\n\nContinue?')) {
      return
    }

    setIsRemoving(true)
    try {
      const response = await fetch('/api/remove-sample-data', {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove sample data')
      }

      toast.success(
        `Sample data removed successfully!`,
        {
          description: `${result.studentsDeleted} students, ${result.classesDeleted} classes, ${result.workRecordsDeleted} work records deleted`,
        }
      )

      // Refresh the page after a short delay to show updated data
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      console.error('Error removing sample data:', error)
      toast.error('Failed to remove sample data', {
        description: error.message || 'An error occurred',
      })
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={handlePopulate}
          disabled={isPopulating || isRemoving}
          variant="outline"
          className="gap-2"
        >
          <Database className="h-4 w-4" />
          {isPopulating ? 'Populating...' : 'Populate Sample Data'}
        </Button>
        <Button
          onClick={handleRemove}
          disabled={isPopulating || isRemoving}
          variant="destructive"
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {isRemoving ? 'Removing...' : 'Remove Sample Data'}
        </Button>
      </div>

      <Dialog open={showProgressDialog} onOpenChange={(open) => !isPopulating && setShowProgressDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Populating Sample Data</DialogTitle>
            <DialogDescription>
              Please wait while we create the test data...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{currentStep}</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            {results && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Students:</span>
                  <span className="font-medium">{results.studentsCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Classes:</span>
                  <span className="font-medium">{results.classesCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Work Records:</span>
                  <span className="font-medium">{results.workRecordsCreated}</span>
                </div>
                {results.errors && results.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-destructive/10 rounded text-destructive text-xs">
                    {results.errors.length} error(s) occurred
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

