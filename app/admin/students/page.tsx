'use client'

import { useState, useEffect } from 'react'
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
import { Plus, Edit, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { studentSchema } from '@/lib/validations'

interface Student {
  id: string
  full_name: string
  school_year_group?: string
  year_group_id?: string
  year_group_name?: string
  created_at: string
}

interface YearGroup {
  id: string
  name: string
  display_order: number
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentSchema),
  })

  useEffect(() => {
    fetchStudents()
    fetchYearGroups()
  }, [])

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students')
      if (!response.ok) throw new Error('Failed to fetch students')
      const data = await response.json()
      setStudents(data)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchYearGroups = async () => {
    try {
      const response = await fetch('/api/year-groups')
      if (!response.ok) throw new Error('Failed to fetch year groups')
      const data = await response.json()
      setYearGroups(data)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const onSubmit = async (data: any) => {
    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students'
      const method = editingStudent ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save student')
      }

      toast.success(editingStudent ? 'Student updated successfully' : 'Student added successfully')
      setShowDialog(false)
      setEditingStudent(null)
      reset()
      fetchStudents()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    reset({
      fullName: student.full_name,
      yearGroupId: student.year_group_id || '',
    })
    setShowDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    try {
      const response = await fetch(`/api/students/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete student')
      }

      toast.success('Student deleted successfully')
      fetchStudents()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage student records</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/students/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          </Link>
          <Button onClick={() => {
            setEditingStudent(null)
            reset()
            setShowDialog(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>List of all students in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : students.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No students found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Year Group</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell>{student.year_group_name || student.school_year_group || 'N/A'}</TableCell>
                    <TableCell>
                      {student.created_at
                        ? new Date(student.created_at).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(student)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(student.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
            <DialogDescription>
              {editingStudent ? 'Update student information' : 'Create a new student record'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...register('fullName')} placeholder="Jane Smith" />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearGroupId">School Year Group</Label>
              <Select
                value={watch('yearGroupId') || ''}
                onValueChange={(value) => setValue('yearGroupId', value, { shouldValidate: true })}
              >
                <SelectTrigger id="yearGroupId">
                  <SelectValue placeholder="Select a year group" />
                </SelectTrigger>
                <SelectContent>
                  {yearGroups.map((yearGroup) => (
                    <SelectItem key={yearGroup.id} value={yearGroup.id}>
                      {yearGroup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.yearGroupId && (
                <p className="text-sm text-destructive">
                  {errors.yearGroupId.message as string}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowDialog(false)
                setEditingStudent(null)
                reset()
              }}>
                Cancel
              </Button>
              <Button type="submit">{editingStudent ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

