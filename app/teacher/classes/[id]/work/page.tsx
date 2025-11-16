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

export default function CreateWorkRecordPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.id as string

  const [qualifications, setQualifications] = useState<TaxonomyItem[]>([])
  const [examBoards, setExamBoards] = useState<TaxonomyItem[]>([])
  const [subjects, setSubjects] = useState<TaxonomyItem[]>([])
  const [topics, setTopics] = useState<TaxonomyItem[]>([])
  const [subtopics, setSubtopics] = useState<TaxonomyItem[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    },
  })

  const selectedQualification = watch('qualificationId')
  const selectedExamBoard = watch('examBoardId')
  const selectedSubject = watch('subjectId')
  const selectedTopic = watch('topicId')

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedQualification) {
      fetchExamBoards(selectedQualification)
    }
  }, [selectedQualification])

  useEffect(() => {
    if (selectedExamBoard) {
      fetchSubjects(selectedExamBoard)
    }
  }, [selectedExamBoard])

  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject)
    }
  }, [selectedSubject])

  useEffect(() => {
    if (selectedTopic) {
      fetchSubtopics(selectedTopic)
    }
  }, [selectedTopic])

  const fetchInitialData = async () => {
    try {
      const [qualsRes, studentsRes] = await Promise.all([
        fetch('/api/taxonomy/qualifications'),
        fetch(`/api/classes/${classId}`),
      ])

      const [quals, classData] = await Promise.all([qualsRes.json(), studentsRes.json()])
      setQualifications(quals)
      
      const studentList = classData.class_students?.map((cs: any) => cs.students) || []
      setStudents(studentList)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchExamBoards = async (qualificationId: string) => {
    const res = await fetch(`/api/taxonomy/exam-boards?qualification_id=${qualificationId}`)
    const data = await res.json()
    setExamBoards(data)
    setValue('examBoardId', undefined as any)
    setValue('subjectId', undefined as any)
    setValue('topicId', undefined as any)
    setValue('subtopicId', undefined as any)
    setTopics([])
    setSubtopics([])
  }

  const fetchSubjects = async (examBoardId: string) => {
    const res = await fetch(`/api/taxonomy/subjects?exam_board_id=${examBoardId}`)
    const data = await res.json()
    setSubjects(data)
    setValue('subjectId', undefined as any)
    setValue('topicId', undefined as any)
    setValue('subtopicId', undefined as any)
    setTopics([])
    setSubtopics([])
  }

  const fetchTopics = async (subjectId: string) => {
    const res = await fetch(`/api/taxonomy/topics?subject_id=${subjectId}`)
    const data = await res.json()
    setTopics(data)
    setValue('topicId', undefined as any)
    setValue('subtopicId', undefined as any)
    setSubtopics([])
  }

  const fetchSubtopics = async (topicId: string) => {
    const res = await fetch(`/api/taxonomy/subtopics?topic_id=${topicId}`)
    const data = await res.json()
    setSubtopics(data)
    setValue('subtopicId', undefined as any)
  }

  const onSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/work-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create work record')
      }

      toast.success('Work record created successfully')
      router.push(`/teacher/classes/${classId}`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const marksObtained = watch('marksObtained')
  const totalMarks = watch('totalMarks')
  const percentage =
    totalMarks && totalMarks > 0
      ? ((marksObtained || 0) / totalMarks) * 100
      : 0

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
        <Link href={`/teacher/classes/${classId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Class
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Create Work Record</h1>
        <p className="text-muted-foreground">Record student work with taxonomy linking</p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Work Record Details</CardTitle>
          <CardDescription>Fill in the details for this work record</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student</Label>
              <Select
                value={watch('studentId')}
                onValueChange={(value) => setValue('studentId', value)}
              >
                <SelectTrigger id="studentId">
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name} ({student.school_year_group})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.studentId && (
                <p className="text-sm text-destructive">{errors.studentId.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="workType">Work Type</Label>
              <Select
                value={watch('workType')}
                onValueChange={(value) => setValue('workType', value as 'homework' | 'classwork')}
              >
                <SelectTrigger id="workType">
                  <SelectValue placeholder="Select work type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homework">Homework</SelectItem>
                  <SelectItem value="classwork">Classwork</SelectItem>
                </SelectContent>
              </Select>
              {errors.workType && (
                <p className="text-sm text-destructive">{errors.workType.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="workTitle">Work Title</Label>
              <Input
                id="workTitle"
                {...register('workTitle')}
                placeholder="Worksheet 1: Algebra Basics"
              />
              {errors.workTitle && (
                <p className="text-sm text-destructive">{errors.workTitle.message as string}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qualificationId">Qualification *</Label>
                <Select
                  value={watch('qualificationId')}
                  onValueChange={(value) => setValue('qualificationId', value)}
                >
                  <SelectTrigger id="qualificationId">
                    <SelectValue placeholder="Select qualification" />
                  </SelectTrigger>
                  <SelectContent>
                    {qualifications.map((qual) => (
                      <SelectItem key={qual.id} value={qual.id}>
                        {qual.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.qualificationId && (
                  <p className="text-sm text-destructive">
                    {errors.qualificationId.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="examBoardId">Exam Board *</Label>
                <Select
                  value={watch('examBoardId')}
                  onValueChange={(value) => setValue('examBoardId', value)}
                  disabled={!selectedQualification}
                >
                  <SelectTrigger id="examBoardId">
                    <SelectValue placeholder="Select exam board" />
                  </SelectTrigger>
                  <SelectContent>
                    {examBoards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.examBoardId && (
                  <p className="text-sm text-destructive">
                    {errors.examBoardId.message as string}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subjectId">Subject *</Label>
                <Select
                  value={watch('subjectId')}
                  onValueChange={(value) => setValue('subjectId', value)}
                  disabled={!selectedExamBoard}
                >
                  <SelectTrigger id="subjectId">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.subjectId && (
                  <p className="text-sm text-destructive">{errors.subjectId.message as string}</p>
                )}
              </div>

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

            <div className="space-y-2">
              <Label htmlFor="assignedDate">Assigned Date</Label>
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
                <Label htmlFor="marksObtained">Marks Obtained</Label>
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
                <Label htmlFor="totalMarks">Total Marks</Label>
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
              <Link href={`/teacher/classes/${classId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Create Record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

