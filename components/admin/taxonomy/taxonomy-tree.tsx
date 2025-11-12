'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Plus, Edit, Trash2 } from 'lucide-react'
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
import { toast } from 'sonner'

interface TaxonomyNode {
  id: string
  name: string
  children?: TaxonomyNode[]
}

interface TaxonomyTreeProps {
  type: 'qualification' | 'examBoard' | 'subject' | 'topic' | 'subtopic'
  data: TaxonomyNode[]
  parentId?: string
  onRefresh: () => void
  parentOptions?: { id: string; name: string }[]
}

export function TaxonomyTree({
  type,
  data,
  parentId,
  onRefresh,
  parentOptions,
}: TaxonomyTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [formData, setFormData] = useState({ name: '', parentId: parentId || '' })
  const [fetchedParentOptions, setFetchedParentOptions] = useState<{ id: string; name: string }[]>([])
  
  useEffect(() => {
    const fetchParentOptions = async () => {
      if (type === 'examBoard') {
        const res = await fetch('/api/taxonomy/qualifications')
        const quals = await res.json()
        setFetchedParentOptions(quals.map((q: any) => ({ id: q.id, name: q.name })))
      } else if (type === 'subject' && parentId) {
        const res = await fetch(`/api/taxonomy/exam-boards?qualification_id=${parentId}`)
        const boards = await res.json()
        setFetchedParentOptions(boards.map((b: any) => ({ id: b.id, name: b.name })))
      } else if (type === 'topic' && parentId) {
        const res = await fetch(`/api/taxonomy/subjects?exam_board_id=${parentId}`)
        const subjects = await res.json()
        setFetchedParentOptions(subjects.map((s: any) => ({ id: s.id, name: s.name })))
      } else if (type === 'subtopic' && parentId) {
        const res = await fetch(`/api/taxonomy/topics?subject_id=${parentId}`)
        const topics = await res.json()
        setFetchedParentOptions(topics.map((t: any) => ({ id: t.id, name: t.name })))
      }
    }
    
    if (!parentOptions && type !== 'qualification') {
      fetchParentOptions()
    }
  }, [type, parentId, parentOptions])
  
  const availableParentOptions = parentOptions || fetchedParentOptions

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpanded(newExpanded)
  }

  const handleAdd = async () => {
    try {
      const endpoint = getEndpoint(type)
      const body: any = { name: formData.name }
      
      if (type === 'examBoard' && formData.parentId) {
        body.qualificationId = formData.parentId
      } else if (type === 'subject' && formData.parentId) {
        body.examBoardId = formData.parentId
      } else if (type === 'topic' && formData.parentId) {
        body.subjectId = formData.parentId
      } else if (type === 'subtopic' && formData.parentId) {
        body.topicId = formData.parentId
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create')
      }

      toast.success('Created successfully')
      setShowAddDialog(false)
      setFormData({ name: '', parentId: '' })
      onRefresh()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = async (id: string) => {
    try {
      const endpoint = `${getEndpoint(type)}/${id}`
      const body: any = { name: formData.name }
      
      if (type === 'examBoard' && formData.parentId) {
        body.qualificationId = formData.parentId
      } else if (type === 'subject' && formData.parentId) {
        body.examBoardId = formData.parentId
      } else if (type === 'topic' && formData.parentId) {
        body.subjectId = formData.parentId
      } else if (type === 'subtopic' && formData.parentId) {
        body.topicId = formData.parentId
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update')
      }

      toast.success('Updated successfully')
      setShowEditDialog(false)
      setEditingId(null)
      setFormData({ name: '', parentId: '' })
      onRefresh()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item? This will also delete all children.')) {
      return
    }

    try {
      const endpoint = `${getEndpoint(type)}/${id}`
      const response = await fetch(endpoint, { method: 'DELETE' })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete')
      }

      toast.success('Deleted successfully')
      onRefresh()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const openEditDialog = (node: TaxonomyNode) => {
    setEditingId(node.id)
    setFormData({ name: node.name, parentId: parentId || '' })
    setShowEditDialog(true)
  }

  const getEndpoint = (t: string) => {
    const endpoints: Record<string, string> = {
      qualification: '/api/taxonomy/qualifications',
      examBoard: '/api/taxonomy/exam-boards',
      subject: '/api/taxonomy/subjects',
      topic: '/api/taxonomy/topics',
      subtopic: '/api/taxonomy/subtopics',
    }
    return endpoints[t] || ''
  }

  const getLabel = () => {
    const labels: Record<string, string> = {
      qualification: 'Qualification',
      examBoard: 'Exam Board',
      subject: 'Subject',
      topic: 'Topic',
      subtopic: 'Subtopic',
    }
    return labels[type] || ''
  }

  const getParentLabel = () => {
    const labels: Record<string, string> = {
      examBoard: 'Qualification',
      subject: 'Exam Board',
      topic: 'Subject',
      subtopic: 'Topic',
    }
    return labels[type] || ''
  }

  return (
    <div className="space-y-1">
      {data.map((node) => (
        <div key={node.id} className="group">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted">
            {node.children && node.children.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleExpand(node.id)}
              >
                {expanded.has(node.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            {(!node.children || node.children.length === 0) && <div className="w-6" />}
            <span className="flex-1 text-sm">{node.name}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => openEditDialog(node)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive"
                onClick={() => handleDelete(node.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {expanded.has(node.id) && node.children && (
            <div className="ml-6 border-l pl-2">
              {type === 'qualification' && (
                <TaxonomyTree
                  type="examBoard"
                  data={node.children || []}
                  parentId={node.id}
                  onRefresh={onRefresh}
                />
              )}
              {type === 'examBoard' && (
                <TaxonomyTree
                  type="subject"
                  data={node.children || []}
                  parentId={node.id}
                  onRefresh={onRefresh}
                />
              )}
              {type === 'subject' && (
                <TaxonomyTree
                  type="topic"
                  data={node.children || []}
                  parentId={node.id}
                  onRefresh={onRefresh}
                />
              )}
              {type === 'topic' && (
                <TaxonomyTree
                  type="subtopic"
                  data={node.children || []}
                  parentId={node.id}
                  onRefresh={onRefresh}
                />
              )}
            </div>
          )}
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => {
          setFormData({ name: '', parentId: parentId || '' })
          setShowAddDialog(true)
        }}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add {getLabel()}
      </Button>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {getLabel()}</DialogTitle>
            <DialogDescription>Create a new {getLabel().toLowerCase()}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {availableParentOptions && availableParentOptions.length > 0 && (
              <div className="space-y-2">
                <Label>{getParentLabel()}</Label>
                <Select
                  value={formData.parentId}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${getParentLabel()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={`Enter ${getLabel().toLowerCase()} name`}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {getLabel()}</DialogTitle>
            <DialogDescription>Update {getLabel().toLowerCase()} details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {availableParentOptions && availableParentOptions.length > 0 && (
              <div className="space-y-2">
                <Label>{getParentLabel()}</Label>
                <Select
                  value={formData.parentId}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${getParentLabel()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={`Enter ${getLabel().toLowerCase()} name`}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => editingId && handleEdit(editingId)}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

