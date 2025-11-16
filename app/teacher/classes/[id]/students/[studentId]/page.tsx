import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import DeleteWorkRecordButton from '@/components/teacher/delete-work-record-button'

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>
}) {
  const user = await requireAuth('teacher')
  const supabase = await createClient()
  const { id, studentId } = await params

  // Get student info
  const { data: student } = await supabase
    .from('students')
    .select('id, full_name, school_year_group')
    .eq('id', studentId)
    .single()

  // Get work records for this student in this class
  const { data: workRecords } = await supabase
    .from('work_records')
    .select(`
      *,
      qualifications(name),
      exam_boards(name),
      subjects(name),
      topics(name),
      subtopics(name)
    `)
    .eq('student_id', studentId)
    .eq('class_id', id)
    .eq('teacher_id', user.id)
    .order('assigned_date', { ascending: false })

  if (!student) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Student not found</p>
            <Link href={`/teacher/classes/${id}`}>
              <Button className="mt-4">Back to Class</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const averagePercentage =
    workRecords && workRecords.length > 0
      ? workRecords.reduce((sum, record) => sum + (record.percentage || 0), 0) /
        workRecords.length
      : 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href={`/teacher/classes/${id}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Class
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{student.full_name}</h1>
            <p className="text-muted-foreground">
              {student.school_year_group} - Progress Tracking
            </p>
          </div>
          <Link href={`/teacher/classes/${id}/students/${studentId}/record-work-sheet`}>
            <Button>Record Work (Sheet View)</Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workRecords?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averagePercentage.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workRecords?.filter((r) => r.marks_obtained > 0).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work History Timeline</CardTitle>
          <CardDescription>All work records for this student</CardDescription>
        </CardHeader>
        <CardContent>
          {!workRecords || workRecords.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No work records found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Work Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workRecords.map((record: any) => {
                  const percentage = record.percentage || 0
                  const isWeak = percentage > 0 && percentage < 80
                  
                  return (
                  <TableRow 
                    key={record.id}
                    className={isWeak ? 'bg-red-100 dark:bg-red-950/30' : ''}
                  >
                    <TableCell>
                      {new Date(record.assigned_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{record.work_title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.work_type === 'homework'
                            ? 'default'
                            : record.work_type === 'classwork'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {record.work_type === 'past_paper' ? 'Past Paper' : record.work_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.subjects?.name || 'N/A'}
                      {record.topics?.name && ` - ${record.topics.name}`}
                      {record.subtopics?.name && ` > ${record.subtopics.name}`}
                    </TableCell>
                    <TableCell>
                      {record.marks_obtained || 0} / {record.total_marks}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.percentage >= 70
                            ? 'default'
                            : record.percentage >= 50
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {record.percentage?.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === 'submitted'
                            ? 'default'
                            : record.status === 'resit'
                            ? 'secondary'
                            : record.status === 're_assigned'
                            ? 'outline'
                            : 'destructive'
                        }
                      >
                        {record.status === 'not_submitted'
                          ? 'Not Submitted'
                          : record.status === 'submitted'
                          ? 'Submitted'
                          : record.status === 'resit'
                          ? 'Resit'
                          : 'Re-assigned'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteWorkRecordButton workRecordId={record.id} />
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

