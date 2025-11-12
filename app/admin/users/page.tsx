'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { teacherSchema } from '@/lib/validations'

interface Teacher {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

export default function UsersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const hasFetchedRef = useRef(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(teacherSchema),
  })

  const fetchTeachers = useCallback(async () => {
    if (hasFetchedRef.current) return // Prevent duplicate fetches
    
    try {
      hasFetchedRef.current = true
      setIsLoading(true)
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch teachers')
      const data = await response.json()
      setTeachers(data)
    } catch (error: any) {
      toast.error(error.message)
      hasFetchedRef.current = false // Reset on error so it can retry
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  const onSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create teacher')
      }

      toast.success('Teacher created successfully! Default password: 12345678')
      
      setShowDialog(false)
      reset()
      hasFetchedRef.current = false // Reset to allow refetch
      fetchTeachers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return

    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete teacher')
      }

      toast.success('Teacher deleted successfully')
      hasFetchedRef.current = false // Reset to allow refetch
      fetchTeachers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teachers</h1>
          <p className="text-muted-foreground">Manage teacher accounts</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          </Link>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Teacher
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>List of all teacher accounts in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : teachers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No teachers found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.full_name}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>
                      {teacher.created_at
                        ? new Date(teacher.created_at).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(teacher.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <DialogTitle>Add Teacher</DialogTitle>
            <DialogDescription>Create a new teacher account</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...register('fullName')} placeholder="John Doe" />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="teacher@example.com" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message as string}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

