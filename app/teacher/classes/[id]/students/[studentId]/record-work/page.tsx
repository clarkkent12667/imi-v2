'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { workRecordSchema } from '@/lib/validations'

interface TaxonomyItem {
  id: string
  name: string
}

interface ClassData {
  id: string
  name: string
  subject_id: string
  subjects: {
    id: string
    name: string
    exam_boards: {
      id: string
      name: string
      qualifications: {
        id: string
        name: string
      }
    }
  }
}

export default function RecordWorkPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.id as string
  const studentId = params.studentId as string

  const [classData, setClassData] = useState<ClassData | null>(null)
  const [topics, setTopics] = useState<TaxonomyItem[]>([])
  const [subtopics, setSubtopics] = useState<TaxonomyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [studentName, setStudentName] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(workRecordSchema),
    defaultValues: {
      classId,
      studentId,
      assignedDate: new Date().toISOString().split('T')[0],
    },
  })

  const workType = watch('workType')
  const selectedSubject = watch('subjectId')
  const selectedTopic = watch('topicId')
  const marksObtained = watch('marksObtained')
  const totalMarks = watch('totalMarks')
  const percentage =
    totalMarks && totalMarks > 0 ? ((marksObtained || 0) / totalMarks) * 100 : 0

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedSubject && workType !== 'past_paper') {
      fetchTopics(selectedSubject)
    } else {
      setTopics([])
      setSubtopics([])
      setValue('topicId', undefined as any)
      setValue('subtopicId', undefined as any)
    }
  }, [selectedSubject, workType])

  useEffect(() => {
    if (selectedTopic && workType !== 'past_paper') {
      fetchSubtopics(selectedTopic)
    } else {
      setSubtopics([])
      setValue('subtopicId', undefined as any)
    }
  }, [selectedTopic, workType])

  const fetchInitialData = async () => {
    try {
      const [classRes, studentRes] = await Promise.all([
        fetch(`/api/classes/${classId}`),
        fetch(`/api/students/${studentId}`),
      ])

      if (!classRes.ok || !studentRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [classDataResult, studentData] = await Promise.all([
        classRes.json(),
        studentRes.json(),
      ])

      setClassData(classDataResult)
      setStudentName(studentData.full_name || 'Student')

      // Set default values from class
      if (classDataResult.subjects) {
        const subject = classDataResult.subjects
        setValue('subjectId', subject.id)
        setValue('qualificationId', subject.exam_boards?.qualifications?.id)
        setValue('examBoardId', subject.exam_boards?.id)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTopics = async (subjectId: string) => {
    try {
      const res = await fetch(`/api/taxonomy/topics?subject_id=${subjectId}`)
      const data = await res.json()
      setTopics(data)
      setValue('topicId', undefined as any)
      setValue('subtopicId', undefined as any)
      setSubtopics([])
    } catch (error: any) {
      toast.error('Failed to load topics')
    }
  }

  const fetchSubtopics = async (topicId: string) => {
    try {
      const res = await fetch(`/api/taxonomy/subtopics?topic_id=${topicId}`)
      const data = await res.json()
      setSubtopics(data)
      setValue('subtopicId', undefined as any)
    } catch (error: any) {
      toast.error('Failed to load subtopics')
    }
  }

  const onSubmit = async (data: any) => {
    try {
      // Generate work title if not provided
      if (!data.workTitle) {
        const workTypeLabel =
          data.workType === 'homework'
            ? 'Homework'
            : data.workType === 'classwork'
            ? 'Classwork'
            : 'Past Paper'
        const date = new Date(data.assignedDate).toLocaleDateString()
        data.workTitle = `${workTypeLabel} - ${date}`
      }

      // For past paper, clear topic and subtopic
      if (data.workType === 'past_paper') {
        data.topicId = undefined
        data.subtopicId = undefined
      }

      const response = await fetch('/api/work-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create work record')
      }

      toast.success('Work recorded successfully')
      router.push(`/teacher/classes/${classId}/students/${studentId}`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!classData || !classData.subjects) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Class or subject information not found</p>
            <Link href={`/teacher/classes/${classId}`}>
              <Button className="mt-4">Back to Class</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const subject = classData.subjects
  const examBoard = subject.exam_boards
  const qualification = examBoard?.qualifications

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href={`/teacher/classes/${classId}/students/${studentId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Student Progress
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Record Work for {studentName}</h1>
        <p className="text-muted-foreground">
          {classData.name} - {subject.name}
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Work Details</CardTitle>
          <CardDescription>Record homework, classwork, or past paper</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workType">Work Type *</Label>
              <Select
                value={watch('workType')}
                onValueChange={(value) => {
                  setValue('workType', value as 'homework' | 'classwork' | 'past_paper')
                  // Clear topic/subtopic when switching to past paper
                  if (value === 'past_paper') {
                    setValue('topicId', undefined as any)
                    setValue('subtopicId', undefined as any)
                    setTopics([])
                    setSubtopics([])
                  } else if (selectedSubject) {
                    fetchTopics(selectedSubject)
                  }
                }}
              >
                <SelectTrigger id="workType">
                  <SelectValue placeholder="Select work type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homework">Homework</SelectItem>
                  <SelectItem value="classwork">Classwork</SelectItem>
                  <SelectItem value="past_paper">Past Paper</SelectItem>
                </SelectContent>
              </Select>
              {errors.workType && (
                <p className="text-sm text-destructive">{errors.workType.message as string}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted p-4">
              <div>
                <Label className="text-xs text-muted-foreground">Qualification</Label>
                <p className="font-medium">{qualification?.name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Exam Board</Label>
                <p className="font-medium">{examBoard?.name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="font-medium">{subject.name}</p>
              </div>
            </div>

            {workType && workType !== 'past_paper' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="topicId">Topic (Optional)</Label>
                  <Select
                    value={watch('topicId') || 'none'}
                    onValueChange={(value) => {
                      setValue('topicId', value === 'none' ? undefined : value)
                    }}
                    disabled={!selectedSubject}
                  >
                    <SelectTrigger id="topicId">
                      <SelectValue placeholder="Select topic (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtopicId">Subtopic (Optional)</Label>
                  <Select
                    value={watch('subtopicId') || 'none'}
                    onValueChange={(value) => {
                      setValue('subtopicId', value === 'none' ? undefined : value)
                    }}
                    disabled={!selectedTopic}
                  >
                    <SelectTrigger id="subtopicId">
                      <SelectValue placeholder="Select subtopic (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {subtopics.map((subtopic) => (
                        <SelectItem key={subtopic.id} value={subtopic.id}>
                          {subtopic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="assignedDate">Assigned Date *</Label>
              <Input
                id="assignedDate"
                type="date"
                {...register('assignedDate')}
                defaultValue={new Date().toISOString().split('T')[0]}
              />
              {errors.assignedDate && (
                <p className="text-sm text-destructive">{errors.assignedDate.message as string}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Due date will be automatically set to 7 days after assigned date
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marksObtained">Marks Obtained *</Label>
                <Input
                  id="marksObtained"
                  type="number"
                  step="0.01"
                  {...register('marksObtained', { valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.marksObtained && (
                  <p className="text-sm text-destructive">
                    {errors.marksObtained.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalMarks">Total Marks *</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  step="0.01"
                  {...register('totalMarks', { valueAsNumber: true })}
                  placeholder="100"
                />
                {errors.totalMarks && (
                  <p className="text-sm text-destructive">
                    {errors.totalMarks.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Percentage</Label>
                <Input
                  value={percentage.toFixed(2) + '%'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Link href={`/teacher/classes/${classId}/students/${studentId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Record Work
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

