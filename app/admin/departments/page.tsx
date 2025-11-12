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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, Users, X, Search, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const departmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

interface Department {
  id: string
  name: string
  created_at: string
}

interface Teacher {
  id: string
  full_name: string
  email: string
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [departmentTeachers, setDepartmentTeachers] = useState<Record<string, Teacher[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showTeachersDialog, setShowTeachersDialog] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(departmentSchema),
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [departmentsRes, teachersRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/users'),
      ])

      if (!departmentsRes.ok || !teachersRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [departmentsData, teachersData] = await Promise.all([
        departmentsRes.json(),
        teachersRes.json(),
      ])

      setDepartments(departmentsData)
      setTeachers(teachersData)

      // Fetch teachers for each department
      const teachersMap: Record<string, Teacher[]> = {}
      for (const dept of departmentsData) {
        try {
          const teachersRes = await fetch(`/api/departments/${dept.id}/teachers`)
          if (teachersRes.ok) {
            teachersMap[dept.id] = await teachersRes.json()
          }
        } catch (error) {
          teachersMap[dept.id] = []
        }
      }
      setDepartmentTeachers(teachersMap)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDepartmentTeachers = async (departmentId: string) => {
    try {
      const response = await fetch(`/api/departments/${departmentId}/teachers`)
      if (!response.ok) throw new Error('Failed to fetch teachers')
      const data = await response.json()
      setDepartmentTeachers((prev) => ({ ...prev, [departmentId]: data }))
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const onSubmit = async (data: any) => {
    try {
      const url = editingDepartment
        ? `/api/departments/${editingDepartment.id}`
        : '/api/departments'
      const method = editingDepartment ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save department')
      }

      toast.success(
        editingDepartment ? 'Department updated successfully' : 'Department added successfully'
      )
      setShowDialog(false)
      setEditingDepartment(null)
      reset()
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = (department: Department) => {
    setEditingDepartment(department)
    reset({
      name: department.name,
    })
    setShowDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return

    try {
      const response = await fetch(`/api/departments/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete department')
      }

      toast.success('Department deleted successfully')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleManageTeachers = (department: Department) => {
    setSelectedDepartment(department)
    setSelectedTeacherIds(new Set())
    setSearchQuery('')
    setShowTeachersDialog(true)
  }

  const handleAddTeacher = async (teacherId: string) => {
    if (!selectedDepartment) return

    try {
      const response = await fetch(`/api/departments/${selectedDepartment.id}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: teacherId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add teacher')
      }

      toast.success('Teacher added to department')
      fetchDepartmentTeachers(selectedDepartment.id)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleAddSelectedTeachers = async () => {
    if (!selectedDepartment || selectedTeacherIds.size === 0) return

    const teacherIdsArray = Array.from(selectedTeacherIds)
    let successCount = 0
    let errorCount = 0

    // Add teachers in parallel
    await Promise.all(
      teacherIdsArray.map(async (teacherId) => {
        try {
          await handleAddTeacher(teacherId)
          successCount++
        } catch (error) {
          errorCount++
        }
      })
    )

    if (errorCount === 0) {
      toast.success(`Successfully added ${successCount} teacher${successCount !== 1 ? 's' : ''}`)
    } else {
      toast.warning(`Added ${successCount} teacher${successCount !== 1 ? 's' : ''}, ${errorCount} failed`)
    }

    setSelectedTeacherIds(new Set())
  }

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(teacherId)) {
        newSet.delete(teacherId)
      } else {
        newSet.add(teacherId)
      }
      return newSet
    })
  }

  const toggleAllAvailableTeachers = () => {
    if (!selectedDepartment) return

    const availableTeachers = teachers.filter(
      (teacher) =>
        !departmentTeachers[selectedDepartment.id]?.some((dt) => dt.id === teacher.id) &&
        (searchQuery === '' ||
          teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.email.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const allSelected = availableTeachers.every((t) => selectedTeacherIds.has(t.id))

    if (allSelected) {
      // Deselect all
      setSelectedTeacherIds(new Set())
    } else {
      // Select all available
      const newSet = new Set(selectedTeacherIds)
      availableTeachers.forEach((t) => newSet.add(t.id))
      setSelectedTeacherIds(newSet)
    }
  }

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!selectedDepartment) return

    try {
      const response = await fetch(
        `/api/departments/${selectedDepartment.id}/teachers?user_id=${teacherId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove teacher')
      }

      toast.success('Teacher removed from department')
      fetchDepartmentTeachers(selectedDepartment.id)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departments</h1>
          <p className="text-muted-foreground">Manage departments for class organization</p>
        </div>
        <Button
          onClick={() => {
            setEditingDepartment(null)
            reset()
            setShowDialog(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Departments</CardTitle>
          <CardDescription>List of all departments in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : departments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No departments found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Teachers</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => {
                  const deptTeachers = departmentTeachers[department.id] || []
                  return (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">{department.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {deptTeachers.length} teacher{deptTeachers.length !== 1 ? 's' : ''}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleManageTeachers(department)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {department.created_at
                          ? new Date(department.created_at).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(department)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDelete(department.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Edit Department' : 'Add Department'}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? 'Update department information'
                : 'Create a new department'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} placeholder="Senior Department" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message as string}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false)
                  setEditingDepartment(null)
                  reset()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">{editingDepartment ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Teachers Dialog */}
      <Dialog open={showTeachersDialog} onOpenChange={(open) => {
        setShowTeachersDialog(open)
        if (!open) {
          setSelectedTeacherIds(new Set())
          setSearchQuery('')
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Teachers - {selectedDepartment?.name}</DialogTitle>
            <DialogDescription>
              Select multiple teachers to add or remove them from this department
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current Teachers */}
            <div>
              <Label className="mb-2 block">Current Teachers ({selectedDepartment ? departmentTeachers[selectedDepartment.id]?.length || 0 : 0})</Label>
              {selectedDepartment && (
                <div className="space-y-2">
                  {departmentTeachers[selectedDepartment.id]?.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No teachers assigned to this department
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                      {departmentTeachers[selectedDepartment.id]?.map((teacher) => (
                        <Badge key={teacher.id} variant="secondary" className="px-3 py-1.5 text-sm">
                          {teacher.full_name}
                          <button
                            onClick={() => handleRemoveTeacher(teacher.id)}
                            className="ml-2 hover:text-destructive transition-colors"
                            title="Remove teacher"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add Teachers - Multi-select */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Available Teachers</Label>
                {selectedDepartment && selectedTeacherIds.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleAddSelectedTeachers}
                    className="h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add {selectedTeacherIds.size} Teacher{selectedTeacherIds.size !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Teacher List */}
              {selectedDepartment && (
                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  {(() => {
                    const availableTeachers = teachers.filter(
                      (teacher) =>
                        !departmentTeachers[selectedDepartment.id]?.some(
                          (dt) => dt.id === teacher.id
                        ) &&
                        (searchQuery === '' ||
                          teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          teacher.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    )

                    if (availableTeachers.length === 0) {
                      return (
                        <div className="p-8 text-center text-muted-foreground">
                          {searchQuery
                            ? 'No teachers found matching your search'
                            : 'All teachers are already in this department'}
                        </div>
                      )
                    }

                    const allSelected = availableTeachers.every((t) => selectedTeacherIds.has(t.id))

                    return (
                      <div className="divide-y">
                        {/* Select All */}
                        <div className="p-2 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center space-x-2 px-2">
                            <Checkbox
                              id="select-all"
                              checked={allSelected && availableTeachers.length > 0}
                              onCheckedChange={toggleAllAvailableTeachers}
                            />
                            <label
                              htmlFor="select-all"
                              className="text-sm font-medium cursor-pointer flex-1"
                            >
                              Select All ({availableTeachers.length})
                            </label>
                          </div>
                        </div>

                        {/* Teacher Items */}
                        {availableTeachers.map((teacher) => (
                          <div
                            key={teacher.id}
                            className="p-2 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => toggleTeacherSelection(teacher.id)}
                          >
                            <div className="flex items-center space-x-2 px-2">
                              <Checkbox
                                id={`teacher-${teacher.id}`}
                                checked={selectedTeacherIds.has(teacher.id)}
                                onCheckedChange={() => toggleTeacherSelection(teacher.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <label
                                htmlFor={`teacher-${teacher.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                <div className="font-medium">{teacher.full_name}</div>
                                <div className="text-xs text-muted-foreground">{teacher.email}</div>
                              </label>
                              {selectedTeacherIds.has(teacher.id) && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

