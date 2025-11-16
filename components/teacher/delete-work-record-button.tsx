'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DeleteWorkRecordButtonProps {
  workRecordId: string
}

export default function DeleteWorkRecordButton({ workRecordId }: DeleteWorkRecordButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this work record?')) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/work-records/${workRecordId}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete work record')
      }

      toast.success('Work record deleted successfully')
      router.refresh() // Refresh server component data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete work record'
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}

