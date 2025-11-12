'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Calendar, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { classSchema } from '@/lib/validations'
import { Checkbox } from '@/components/ui/checkbox'

interface Class {
  id: string
  name: string
  teacher_id: string
  users: {
    id: string
    full_name: string
    email: string
  }
  created_at: string
}

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

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const hasFetchedRef = useRef(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(classSchema),
  })

  const fetchData = async () => {
    if (hasFetchedRef.current) return // Prevent duplicate fetches
    
    try {
      hasFetchedRef.current = true
      setIsLoading(true)
      
      const [classesRes, teachersRes, studentsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/users'),
        fetch('/api/students'),
      ])

      if (!classesRes.ok || !teachersRes.ok || !studentsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [classesData, teachersData, studentsData] = await Promise.all([
        classesRes.json(),
        teachersRes.json(),
        studentsRes.json(),
      ])

      setClasses(classesData)
      setTeachers(teachersData)
      setStudents(studentsData)
    } catch (error: any) {
      toast.error(error.message)
      hasFetchedRef.current = false // Reset on error so it can retry
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!hasFetchedRef.current) {
      fetchData()
    }
  }, [])

  const handleCreateClass = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (isSubmitting) return // Prevent double submission
    
    const formData = {
      name: watch('name') || '',
      teacherId: watch('teacherId') || '',
      studentIds: selectedStudents,
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

      console.log('Submitting class:', formData)

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          teacherId: formData.teacherId,
          studentIds: formData.studentIds,
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
      hasFetchedRef.current = false // Reset to allow refetch
      await fetchData()
    } catch (error: any) {
      console.error('Error creating class:', error)
      toast.error(error.message || 'Failed to create class')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = async (data: any) => {
    // Use the manual handler instead
    await handleCreateClass()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return

    try {
      const response = await fetch(`/api/classes/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete class')
      }

      toast.success('Class deleted successfully')
      hasFetchedRef.current = false // Reset to allow refetch
      await fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Manage classes and assign teachers and students</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Class
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>List of all classes in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : classes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No classes found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classItem) => (
                  <TableRow key={classItem.id}>
                    <TableCell className="font-medium">{classItem.name}</TableCell>
                    <TableCell>{classItem.users?.full_name || 'N/A'}</TableCell>
                    <TableCell>
                      {classItem.created_at
                        ? new Date(classItem.created_at).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/classes/${classItem.id}/schedule`}>
                          <Button variant="ghost" size="sm">
                            <Calendar className="mr-2 h-4 w-4" />
                            Schedule
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(classItem.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
              <Button type="button" variant="outline" onClick={() => {
                setShowDialog(false)
                reset()
                setSelectedStudents([])
              }}>
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  console.log('Button clicked!', {
                    name: watch('name'),
                    teacherId: watch('teacherId'),
                    selectedStudents: selectedStudents.length,
                    isSubmitting
                  })
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
    </div>
  )
}

