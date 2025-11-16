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
import { ArrowLeft, BookOpen, ClipboardList } from 'lucide-react'

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth('teacher')
  const supabase = await createClient()
  const { id } = await params

  // Verify teacher owns this class
  const { data: classData } = await supabase
    .from('classes')
    .select('id, name, teacher_id')
    .eq('id', id)
    .single()

  if (!classData || classData.teacher_id !== user.id) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Unauthorized access</p>
            <Link href="/teacher/classes">
              <Button className="mt-4">Back to Classes</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get students in this class
  const { data: classStudents } = await supabase
    .from('class_students')
    .select(`
      student_id,
      students(id, full_name, school_year_group)
    `)
    .eq('class_id', id)

  const students = classStudents?.map((cs: any) => cs.students) || []

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/teacher/classes">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{classData.name}</h1>
          <p className="text-muted-foreground">Manage students and work records</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>Students enrolled in this class</CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No students in this class</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Year Group</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student: any) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell>{student.school_year_group}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/teacher/classes/${id}/students/${student.id}/record-work-sheet`}>
                          <Button variant="default" size="sm">
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Record Work
                          </Button>
                        </Link>
                        <Link href={`/teacher/classes/${id}/students/${student.id}`}>
                          <Button variant="ghost" size="sm">
                            <BookOpen className="mr-2 h-4 w-4" />
                            View Progress
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

