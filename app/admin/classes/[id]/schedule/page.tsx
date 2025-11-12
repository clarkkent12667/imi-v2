'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'

const DAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
]

interface Schedule {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export default function SchedulePage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.id as string
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSchedules()
  }, [classId])

  const fetchSchedules = async () => {
    try {
      const response = await fetch(`/api/schedules?class_id=${classId}`)
      if (!response.ok) throw new Error('Failed to fetch schedules')
      const data = await response.json()
      
      // Initialize all days
      const initialSchedules: Schedule[] = DAYS.map((day) => {
        const existing = data.find((s: any) => s.day_of_week === day.value)
        return existing
          ? {
              dayOfWeek: day.value,
              startTime: existing.start_time || '',
              endTime: existing.end_time || '',
            }
          : {
              dayOfWeek: day.value,
              startTime: '',
              endTime: '',
            }
      })
      setSchedules(initialSchedules)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const updateSchedule = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const updated = [...schedules]
    updated[index] = { ...updated[index], [field]: value }
    setSchedules(updated)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Filter out empty schedules
      const validSchedules = schedules.filter(
        (s) => s.startTime && s.endTime
      )

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          schedules: validSchedules,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save schedules')
      }

      toast.success('Schedule saved successfully')
      router.push('/admin/classes')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    )
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
        <h1 className="text-3xl font-bold">Class Schedule</h1>
        <p className="text-muted-foreground">Set weekly schedule for this class</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Set start and end times for each day of the week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS.map((day, index) => {
              const schedule = schedules[index]
              return (
                <div key={day.value} className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="w-32 font-medium">{day.label}</div>
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor={`start-${day.value}`}>Start Time</Label>
                      <Input
                        id={`start-${day.value}`}
                        type="time"
                        value={schedule.startTime}
                        onChange={(e) => updateSchedule(index, 'startTime', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`end-${day.value}`}>End Time</Label>
                      <Input
                        id={`end-${day.value}`}
                        type="time"
                        value={schedule.endTime}
                        onChange={(e) => updateSchedule(index, 'endTime', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

