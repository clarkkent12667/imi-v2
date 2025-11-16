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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { calculateDueDate } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'

interface TaxonomyItem {
  id: string
  name: string
}

interface TopicWithSubtopics extends TaxonomyItem {
  subtopics: TaxonomyItem[]
}

interface WorkRecord {
  id?: string
  topicId?: string
  subtopicId?: string
  workType: 'homework' | 'classwork'
  assignedDate: string
  dueDate?: string
  marksObtained: number
  totalMarks: number
  status: 'not_submitted' | 'submitted' | 'resit' | 're_assigned'
}

interface PastPaperRecord {
  id?: string
  year: number
  marksObtained: number
  totalMarks: number
  assignedDate: string
  status: 'not_submitted' | 'submitted' | 'resit' | 're_assigned'
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

export default function RecordWorkSheetPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.id as string
  const studentId = params.studentId as string

  const [classData, setClassData] = useState<ClassData | null>(null)
  const [topics, setTopics] = useState<TopicWithSubtopics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [studentName, setStudentName] = useState('')
  const [activeTab, setActiveTab] = useState<'classwork' | 'homework' | 'past_paper'>('classwork')
  
  // Work records organized by topic/subtopic
  const [workRecords, setWorkRecords] = useState<Map<string, WorkRecord>>(new Map())
  
  // Past paper records
  const [pastPapers, setPastPapers] = useState<PastPaperRecord[]>([])
  
  // Existing work records from database
  const [existingRecords, setExistingRecords] = useState<any[]>([])

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      const [classRes, studentRes, workRes] = await Promise.all([
        fetch(`/api/classes/${classId}`),
        fetch(`/api/students/${studentId}`),
        fetch(`/api/work-records?student_id=${studentId}&class_id=${classId}`),
      ])

      if (!classRes.ok || !studentRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [classDataResult, studentData, workData] = await Promise.all([
        classRes.json(),
        studentRes.json(),
        workRes.json(),
      ])

      setClassData(classDataResult)
      setStudentName(studentData.full_name || 'Student')
      setExistingRecords(workData || [])

      // Load topics and subtopics
      if (classDataResult.subjects) {
        await fetchTopicsWithSubtopics(classDataResult.subjects.id)
      }

      // Load existing work records into the map
      loadExistingRecords(workData || [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTopicsWithSubtopics = async (subjectId: string) => {
    try {
      const topicsRes = await fetch(`/api/taxonomy/topics?subject_id=${subjectId}`)
      const topicsData = await topicsRes.json()

      const topicsWithSubtopics = await Promise.all(
        topicsData.map(async (topic: TaxonomyItem) => {
          const subtopicsRes = await fetch(`/api/taxonomy/subtopics?topic_id=${topic.id}`)
          const subtopicsData = await subtopicsRes.json()
          return {
            ...topic,
            subtopics: subtopicsData || [],
          }
        })
      )

      setTopics(topicsWithSubtopics)
    } catch (error: any) {
      toast.error('Failed to load topics and subtopics')
    }
  }

  const loadExistingRecords = (records: any[]) => {
    const recordsMap = new Map<string, WorkRecord>()
    const pastPaperRecords: PastPaperRecord[] = []

    records.forEach((record) => {
      if (record.work_type === 'past_paper') {
        pastPaperRecords.push({
          id: record.id,
          year: record.year || new Date(record.assigned_date).getFullYear(),
          marksObtained: record.marks_obtained || 0,
          totalMarks: record.total_marks || 100,
          assignedDate: record.assigned_date,
          status: record.status || 'not_submitted',
        })
      } else {
        // Include workType in key to separate classwork and homework
        const key = record.subtopic_id 
          ? `${record.work_type}_subtopic_${record.subtopic_id}` 
          : record.topic_id 
          ? `${record.work_type}_topic_${record.topic_id}` 
          : null
        
        if (key) {
          recordsMap.set(key, {
            id: record.id,
            topicId: record.topic_id,
            subtopicId: record.subtopic_id,
            workType: record.work_type,
            assignedDate: record.assigned_date,
            dueDate: record.due_date,
            marksObtained: record.marks_obtained || 0,
            totalMarks: record.total_marks || 100,
            status: record.status || 'not_submitted',
          })
        }
      }
    })

    setWorkRecords(recordsMap)
    setPastPapers(pastPaperRecords)
  }

  const updateWorkRecord = (
    key: string,
    field: keyof WorkRecord,
    value: any
  ) => {
    // Ensure key includes workType prefix
    const fullKey = key.startsWith('classwork_') || key.startsWith('homework_') 
      ? key 
      : `${activeTab}_${key}`
    
    const current = workRecords.get(fullKey) || {
      workType: activeTab as 'homework' | 'classwork',
      assignedDate: '',
      dueDate: '',
      marksObtained: 0,
      totalMarks: 100,
      status: 'not_submitted' as const,
    }
    
    const updated = { ...current, [field]: value }
    // Ensure workType matches active tab when creating new records
    if (!current.id && field !== 'workType') {
      updated.workType = activeTab as 'homework' | 'classwork'
    }
    
    // Auto-calculate due date when assigned date is entered
    if (field === 'assignedDate' && value) {
      // Calculate new due date (7 days from assigned date)
      updated.dueDate = calculateDueDate(value).toISOString().split('T')[0]
    }
    
    // Auto-set status based on percentage when marks are updated
    if ((field === 'marksObtained' || field === 'totalMarks') && updated.totalMarks > 0 && updated.marksObtained > 0) {
      const percentage = (updated.marksObtained / updated.totalMarks) * 100
      if (percentage >= 80) {
        updated.status = 'submitted'
      } else {
        updated.status = 'resit'
      }
    }
    
    setWorkRecords(new Map(workRecords.set(fullKey, updated)))
  }
  
  const getWorkRecordKey = (type: 'topic' | 'subtopic', id: string) => {
    return `${activeTab}_${type}_${id}`
  }

  const updatePastPaper = (index: number, field: keyof PastPaperRecord, value: any) => {
    const updated = [...pastPapers]
    updated[index] = { ...updated[index], [field]: value }
    
    // Auto-set status based on percentage when marks are updated
    if ((field === 'marksObtained' || field === 'totalMarks') && updated[index].totalMarks > 0 && updated[index].marksObtained > 0) {
      const percentage = (updated[index].marksObtained / updated[index].totalMarks) * 100
      if (percentage >= 80) {
        updated[index].status = 'submitted'
      } else {
        updated[index].status = 'resit'
      }
    }
    
    setPastPapers(updated)
  }

  const addPastPaper = () => {
    setPastPapers([
      ...pastPapers,
      {
        year: new Date().getFullYear(),
        marksObtained: 0,
        totalMarks: 100,
        assignedDate: new Date().toISOString().split('T')[0],
        status: 'not_submitted',
      },
    ])
  }

  const saveAllWork = async () => {
    try {
      const subject = classData?.subjects
      if (!subject) throw new Error('Subject not found')

      const promises: Promise<any>[] = []

      // Save classwork/homework records (only subtopics, not topics)
      workRecords.forEach((record, key) => {
        // Parse key format: workType_type_id (e.g., "classwork_topic_123" or "homework_subtopic_456")
        const parts = key.split('_')
        const workType = parts[0] as 'homework' | 'classwork'
        const type = parts[1] // 'topic' or 'subtopic'
        
        // Skip topic records - we only grade subtopics
        if (type === 'topic') {
          return
        }
        
        if (record.marksObtained > 0 || record.totalMarks > 0) {
          const id = parts.slice(2).join('_') // Handle UUIDs that might contain underscores
          const topicId = record.topicId
          const subtopicId = id

          const payload = {
            classId,
            studentId,
            workType: record.workType,
            qualificationId: subject.exam_boards?.qualifications?.id,
            examBoardId: subject.exam_boards?.id,
            subjectId: subject.id,
            topicId,
            subtopicId,
            assignedDate: record.assignedDate,
            marksObtained: record.marksObtained,
            totalMarks: record.totalMarks,
            status: record.status,
          }

          if (record.id) {
            // Update existing
            promises.push(
              fetch(`/api/work-records/${record.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
            )
          } else {
            // Create new
            promises.push(
              fetch('/api/work-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
            )
          }
        }
      })

      // Save past papers
      pastPapers.forEach((paper) => {
        if (paper.marksObtained > 0 || paper.totalMarks > 0) {
          const payload = {
            classId,
            studentId,
            workType: 'past_paper' as const,
            qualificationId: subject.exam_boards?.qualifications?.id,
            examBoardId: subject.exam_boards?.id,
            subjectId: subject.id,
            assignedDate: paper.assignedDate,
            marksObtained: paper.marksObtained,
            totalMarks: paper.totalMarks,
            status: paper.status,
            year: paper.year,
          }

          if (paper.id) {
            promises.push(
              fetch(`/api/work-records/${paper.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
            )
          } else {
            promises.push(
              fetch('/api/work-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
            )
          }
        }
      })

      await Promise.all(promises)
      toast.success('Work records saved successfully')
      router.push(`/teacher/classes/${classId}/students/${studentId}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save work records')
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href={`/teacher/classes/${classId}/students/${studentId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Student Progress
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Record Work Sheet - {studentName}</h1>
        <p className="text-muted-foreground">
          {classData.name} - {subject.name}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="classwork">Classwork</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
          <TabsTrigger value="past_paper">Past Papers</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab === 'classwork' ? 'classwork' : 'homework'}>
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'classwork' ? 'Classwork' : 'Homework'} Sheet
              </CardTitle>
              <CardDescription>
                Enter marks for topics and subtopics. Leave blank if no work was assigned.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Topic / Subtopic</TableHead>
                      <TableHead className="w-[120px]">Assigned Date</TableHead>
                      <TableHead className="w-[120px]">Due Date</TableHead>
                      <TableHead className="w-[100px]">Marks Obtained</TableHead>
                      <TableHead className="w-[100px]">Total Marks</TableHead>
                      <TableHead className="w-[100px]">Percentage</TableHead>
                      <TableHead className="w-[150px]">Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topics.map((topic) => {
                      // Count how many subtopics have been graded and calculate average percentage
                      const subtopicRecords = topic.subtopics.map((subtopic) => 
                        workRecords.get(getWorkRecordKey('subtopic', subtopic.id))
                      ).filter(Boolean) as WorkRecord[]
                      
                      const gradedSubtopics = subtopicRecords.filter(record => 
                        (record.marksObtained || 0) > 0 && (record.totalMarks || 0) > 0
                      ).length
                      
                      const totalSubtopics = topic.subtopics.length
                      
                      // Calculate average percentage from subtopics
                      const totalMarksObtained = subtopicRecords.reduce((sum, record) => 
                        sum + (record.marksObtained || 0), 0
                      )
                      const totalMarksPossible = subtopicRecords.reduce((sum, record) => 
                        sum + (record.totalMarks || 0), 0
                      )
                      const averagePercentage = totalMarksPossible > 0
                        ? (totalMarksObtained / totalMarksPossible) * 100
                        : 0
                      
                      return (
                      <>
                        {/* Topic Row */}
                        <TableRow 
                          key={`topic_${topic.id}`} 
                          className="bg-muted/50"
                        >
                          <TableCell className="font-semibold">{topic.name}</TableCell>
                          <TableCell colSpan={5}>
                            <div className="flex items-center justify-between">
                              {totalSubtopics > 0 && (
                                <span className="text-sm text-muted-foreground">
                                  {gradedSubtopics} of {totalSubtopics} subtopics graded
                                </span>
                              )}
                              {averagePercentage > 0 && (
                                <span className="text-sm font-medium">
                                  Average: {averagePercentage.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {averagePercentage > 0 ? `${averagePercentage.toFixed(1)}%` : '-'}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        {/* Subtopic Rows */}
                        {topic.subtopics.map((subtopic) => {
                          const subtopicRecord = workRecords.get(getWorkRecordKey('subtopic', subtopic.id))
                          const subtopicPercentage = subtopicRecord && subtopicRecord.totalMarks > 0
                            ? ((subtopicRecord.marksObtained || 0) / subtopicRecord.totalMarks) * 100
                            : 0
                          const subtopicIsWeak = subtopicPercentage > 0 && subtopicPercentage < 80
                          
                          return (
                          <TableRow 
                            key={`subtopic_${subtopic.id}`}
                            className={subtopicIsWeak ? 'bg-red-100 dark:bg-red-950/30' : ''}
                          >
                            <TableCell className="pl-8 text-muted-foreground">
                              └ {subtopic.name}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={
                                  workRecords.get(getWorkRecordKey('subtopic', subtopic.id))?.assignedDate || ''
                                }
                                onChange={(e) =>
                                  updateWorkRecord(
                                    `subtopic_${subtopic.id}`,
                                    'assignedDate',
                                    e.target.value
                                  )
                                }
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={
                                  workRecords.get(getWorkRecordKey('subtopic', subtopic.id))?.dueDate || ''
                                }
                                onChange={(e) =>
                                  updateWorkRecord(
                                    `subtopic_${subtopic.id}`,
                                    'dueDate',
                                    e.target.value
                                  )
                                }
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={workRecords.get(getWorkRecordKey('subtopic', subtopic.id))?.marksObtained || ''}
                                onChange={(e) =>
                                  updateWorkRecord(
                                    `subtopic_${subtopic.id}`,
                                    'marksObtained',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-8"
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={workRecords.get(getWorkRecordKey('subtopic', subtopic.id))?.totalMarks || ''}
                                onChange={(e) =>
                                  updateWorkRecord(
                                    `subtopic_${subtopic.id}`,
                                    'totalMarks',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-8"
                                placeholder="100"
                              />
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const record = workRecords.get(getWorkRecordKey('subtopic', subtopic.id))
                                const percentage =
                                  record && record.totalMarks > 0
                                    ? ((record.marksObtained || 0) / record.totalMarks) * 100
                                    : 0
                                return percentage > 0 ? `${percentage.toFixed(1)}%` : '-'
                              })()}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={workRecords.get(getWorkRecordKey('subtopic', subtopic.id))?.status || 'not_submitted'}
                                onValueChange={(value) =>
                                  updateWorkRecord(`subtopic_${subtopic.id}`, 'status', value)
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="not_submitted">Not Submitted</SelectItem>
                                  <SelectItem value="submitted">Submitted</SelectItem>
                                  <SelectItem value="resit">Resit</SelectItem>
                                  <SelectItem value="re_assigned">Re-assigned</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {subtopicRecord?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive h-8"
                                  onClick={async () => {
                                    if (!confirm('Are you sure you want to delete this work record?')) return
                                    try {
                                      const response = await fetch(`/api/work-records/${subtopicRecord.id}`, {
                                        method: 'DELETE',
                                      })
                                      if (!response.ok) {
                                        const error = await response.json()
                                        throw new Error(error.error || 'Failed to delete work record')
                                      }
                                      toast.success('Work record deleted successfully')
                                      // Remove from local state
                                      const key = getWorkRecordKey('subtopic', subtopic.id)
                                      const newRecords = new Map(workRecords)
                                      newRecords.delete(key)
                                      setWorkRecords(newRecords)
                                      // Also remove from existing records
                                      setExistingRecords(existingRecords.filter((r: any) => r.id !== subtopicRecord.id))
                                    } catch (error: any) {
                                      toast.error(error.message || 'Failed to delete work record')
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          )
                        })}
                      </>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past_paper">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Past Papers</CardTitle>
                  <CardDescription>
                    Record past paper marks by year. Only year, marks, and status are required.
                  </CardDescription>
                </div>
                <Button onClick={addPastPaper} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Past Paper
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pastPapers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No past papers added. Click "Add Past Paper" to start.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Marks Obtained</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastPapers.map((paper, index) => {
                      const paperPercentage = paper.totalMarks > 0
                        ? ((paper.marksObtained || 0) / paper.totalMarks) * 100
                        : 0
                      const paperIsWeak = paperPercentage > 0 && paperPercentage < 80
                      
                      return (
                      <TableRow 
                        key={index}
                        className={paperIsWeak ? 'bg-red-100 dark:bg-red-950/30' : ''}
                      >
                        <TableCell>
                          <Input
                            type="number"
                            value={paper.year || ''}
                            onChange={(e) =>
                              updatePastPaper(index, 'year', parseInt(e.target.value) || new Date().getFullYear())
                            }
                            className="h-8 w-24"
                            placeholder="2024"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={paper.assignedDate}
                            onChange={(e) => updatePastPaper(index, 'assignedDate', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={paper.marksObtained || ''}
                            onChange={(e) =>
                              updatePastPaper(index, 'marksObtained', parseFloat(e.target.value) || 0)
                            }
                            className="h-8"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={paper.totalMarks || ''}
                            onChange={(e) =>
                              updatePastPaper(index, 'totalMarks', parseFloat(e.target.value) || 0)
                            }
                            className="h-8"
                            placeholder="100"
                          />
                        </TableCell>
                        <TableCell>
                          {paper.totalMarks > 0
                            ? `${((paper.marksObtained || 0) / paper.totalMarks * 100).toFixed(1)}%`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={paper.status}
                            onValueChange={(value) => updatePastPaper(index, 'status', value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_submitted">Not Submitted</SelectItem>
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="resit">Resit</SelectItem>
                              <SelectItem value="re_assigned">Re-assigned</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {paper.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive h-8"
                              onClick={async () => {
                                if (!confirm('Are you sure you want to delete this work record?')) return
                                try {
                                  const response = await fetch(`/api/work-records/${paper.id}`, {
                                    method: 'DELETE',
                                  })
                                  if (!response.ok) {
                                    const error = await response.json()
                                    throw new Error(error.error || 'Failed to delete work record')
                                  }
                                  toast.success('Work record deleted successfully')
                                  // Remove from local state
                                  const updated = pastPapers.filter((_, i) => i !== index)
                                  setPastPapers(updated)
                                  // Also remove from existing records
                                  setExistingRecords(existingRecords.filter((r: any) => r.id !== paper.id))
                                } catch (error: any) {
                                  toast.error(error.message || 'Failed to delete work record')
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end gap-2">
        <Link href={`/teacher/classes/${classId}/students/${studentId}`}>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button onClick={saveAllWork}>
          <Save className="mr-2 h-4 w-4" />
          Save All Work
        </Button>
      </div>
    </div>
  )
}

