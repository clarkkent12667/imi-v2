import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, BookOpen } from 'lucide-react'

export default async function TeacherClassesPage() {
  const user = await requireAuth('teacher')
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      class_students(count),
      class_schedules(count)
    `)
    .eq('teacher_id', user.id)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Classes</h1>
        <p className="text-muted-foreground">View and manage your assigned classes</p>
      </div>

      {!classes || classes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No classes assigned yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem: any) => (
            <Card key={classItem.id}>
              <CardHeader>
                <CardTitle>{classItem.name}</CardTitle>
                <CardDescription>
                  {classItem.class_students?.[0]?.count || 0} students
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{classItem.class_students?.[0]?.count || 0} students</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{classItem.class_schedules?.[0]?.count || 0} schedule entries</span>
                </div>
                <div className="pt-4">
                  <Link href={`/teacher/classes/${classItem.id}`}>
                    <Button className="w-full">View Class</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

