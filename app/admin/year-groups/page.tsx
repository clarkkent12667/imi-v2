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
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const yearGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  displayOrder: z.number().int().min(0).optional().default(0),
})

interface YearGroup {
  id: string
  name: string
  display_order: number
  created_at: string
}

export default function YearGroupsPage() {
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingYearGroup, setEditingYearGroup] = useState<YearGroup | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(yearGroupSchema),
  })

  useEffect(() => {
    fetchYearGroups()
  }, [])

  const fetchYearGroups = async () => {
    try {
      const response = await fetch('/api/year-groups')
      if (!response.ok) throw new Error('Failed to fetch year groups')
      const data = await response.json()
      setYearGroups(data)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: any) => {
    try {
      const url = editingYearGroup
        ? `/api/year-groups/${editingYearGroup.id}`
        : '/api/year-groups'
      const method = editingYearGroup ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save year group')
      }

      toast.success(
        editingYearGroup ? 'Year group updated successfully' : 'Year group added successfully'
      )
      setShowDialog(false)
      setEditingYearGroup(null)
      reset()
      fetchYearGroups()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = (yearGroup: YearGroup) => {
    setEditingYearGroup(yearGroup)
    reset({
      name: yearGroup.name,
      displayOrder: yearGroup.display_order,
    })
    setShowDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this year group?')) return

    try {
      const response = await fetch(`/api/year-groups/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete year group')
      }

      toast.success('Year group deleted successfully')
      fetchYearGroups()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Year Groups</h1>
          <p className="text-muted-foreground">Manage year groups for student organization</p>
        </div>
        <Button
          onClick={() => {
            setEditingYearGroup(null)
            reset()
            setShowDialog(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Year Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Year Groups</CardTitle>
          <CardDescription>List of all year groups in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : yearGroups.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No year groups found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Display Order</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearGroups.map((yearGroup) => (
                  <TableRow key={yearGroup.id}>
                    <TableCell className="font-medium">{yearGroup.name}</TableCell>
                    <TableCell>{yearGroup.display_order}</TableCell>
                    <TableCell>
                      {yearGroup.created_at
                        ? new Date(yearGroup.created_at).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(yearGroup)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(yearGroup.id)}
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
            <DialogTitle>
              {editingYearGroup ? 'Edit Year Group' : 'Add Year Group'}
            </DialogTitle>
            <DialogDescription>
              {editingYearGroup
                ? 'Update year group information'
                : 'Create a new year group'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} placeholder="Year 10" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                {...register('displayOrder', { valueAsNumber: true })}
                placeholder="10"
              />
              {errors.displayOrder && (
                <p className="text-sm text-destructive">
                  {errors.displayOrder.message as string}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first in dropdowns
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false)
                  setEditingYearGroup(null)
                  reset()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">{editingYearGroup ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

