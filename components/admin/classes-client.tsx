'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { classSchema } from '@/lib/validations'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'

interface Teacher {
  id: string
  full_name: string
  email: string
}

interface Student {
  id: string
  full_name: string
  school_year_group: string
}

interface Subject {
  id: string
  name: string
}

interface YearGroup {
  id: string
  name: string
}

interface ClassesClientProps {
  teachers: Teacher[]
  students: Student[]
  subjects: Subject[]
  yearGroups: YearGroup[]
}

export default function ClassesClient({
  teachers,
  students,
  subjects,
  yearGroups,
}: ClassesClientProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])

  const {
    register,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(classSchema),
  })

  const handleCreateClass = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (isSubmitting) return

    const formData = {
      name: watch('name') || '',
      teacherId: watch('teacherId') || '',
      studentIds: selectedStudents,
      subjectId: watch('subjectId') || undefined,
      yearGroupId: watch('yearGroupId') || undefined,
    }

    try {
      setIsSubmitting(true)

      // Validate that at least one student is selected
      if (formData.studentIds.length === 0) {
        toast.error('Please select at least one student')
        setIsSubmitting(false)
        return
      }

      // Validate teacher is selected
      if (!formData.teacherId) {
        toast.error('Please select a teacher')
        setIsSubmitting(false)
        return
      }

      // Validate class name
      if (!formData.name || formData.name.trim() === '') {
        toast.error('Please enter a class name')
        setIsSubmitting(false)
        return
      }

      // Validate subject is selected
      if (!formData.subjectId) {
        toast.error('Please select a subject')
        setIsSubmitting(false)
        return
      }

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          teacherId: formData.teacherId,
          studentIds: formData.studentIds,
          subjectId: formData.subjectId,
          yearGroupId: formData.yearGroupId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create class')
      }

      toast.success('Class created successfully')
      setShowDialog(false)
      reset()
      setSelectedStudents([])
      router.refresh() // Refresh server component data
    } catch (error) {
      console.error('Error creating class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create class'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  // Deduplicate subjects by name
  const uniqueSubjectsMap = new Map<string, Subject>()
  subjects.forEach((subject) => {
    const subjectName = subject.name.toLowerCase()
    if (!uniqueSubjectsMap.has(subjectName)) {
      uniqueSubjectsMap.set(subjectName, subject)
    }
  })
  const uniqueSubjects = Array.from(uniqueSubjectsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create Class
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Class</DialogTitle>
            <DialogDescription>Create a new class and assign teacher and students</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateClass(e); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input id="name" {...register('name')} placeholder="Mathematics Year 10" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacherId">Teacher</Label>
              <Select
                value={watch('teacherId') || ''}
                onValueChange={(value) => {
                  setValue('teacherId', value, { shouldValidate: true })
                }}
              >
                <SelectTrigger id="teacherId">
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.length === 0 ? (
                    <SelectItem value="no-teachers" disabled>
                      No teachers available
                    </SelectItem>
                  ) : (
                    teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name} ({teacher.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.teacherId && (
                <p className="text-sm text-destructive">{errors.teacherId.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjectId">Subject *</Label>
              <Select
                value={watch('subjectId') || ''}
                onValueChange={(value) => {
                  setValue('subjectId', value, { shouldValidate: true })
                }}
              >
                <SelectTrigger id="subjectId">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSubjects.length === 0 ? (
                    <SelectItem value="no-subjects" disabled>
                      No subjects available
                    </SelectItem>
                  ) : (
                    uniqueSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.subjectId && (
                <p className="text-sm text-destructive">{errors.subjectId.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearGroupId">Year Group (Optional)</Label>
              <Select
                value={watch('yearGroupId') || 'none'}
                onValueChange={(value) => {
                  setValue('yearGroupId', value === 'none' ? undefined : value, { shouldValidate: true })
                }}
              >
                <SelectTrigger id="yearGroupId">
                  <SelectValue placeholder="Select a year group (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {yearGroups.length === 0 ? (
                    <SelectItem value="no-year-groups" disabled>
                      No year groups available
                    </SelectItem>
                  ) : (
                    yearGroups.map((yearGroup) => (
                      <SelectItem key={yearGroup.id} value={yearGroup.id}>
                        {yearGroup.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.yearGroupId && (
                <p className="text-sm text-destructive">{errors.yearGroupId.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Students</Label>
              <div className="max-h-60 overflow-y-auto border rounded-lg p-4">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students available</p>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <div key={student.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={student.id}
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => toggleStudent(student.id)}
                        />
                        <label
                          htmlFor={student.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {student.full_name} ({student.school_year_group})
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedStudents.length === 0 && (
                <p className="text-sm text-destructive">At least one student is required</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false)
                  reset()
                  setSelectedStudents([])
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  handleCreateClass(e)
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

