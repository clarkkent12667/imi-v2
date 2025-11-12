import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, BookOpen } from 'lucide-react'

export default async function TeacherDashboardPage() {
  const user = await requireAuth('teacher')
  const supabase = await createClient()

  // Get teacher's classes
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .eq('teacher_id', user.id)

  const classIds = classes?.map((c) => c.id) || []

  // Get counts
  const [studentsResult, workRecordsResult] = await Promise.all([
    supabase
      .from('class_students')
      .select('student_id', { count: 'exact', head: true })
      .in('class_id', classIds),
    supabase
      .from('work_records')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', user.id),
  ])

  const stats = [
    {
      title: 'My Classes',
      value: classes?.length || 0,
      icon: Calendar,
      description: 'Classes assigned to you',
    },
    {
      title: 'Students',
      value: studentsResult.count || 0,
      icon: Users,
      description: 'Total students in your classes',
    },
    {
      title: 'Work Records',
      value: workRecordsResult.count || 0,
      icon: BookOpen,
      description: 'Total work records created',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.fullName}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {classes && classes.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Your Classes</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <Card key={classItem.id}>
                <CardHeader>
                  <CardTitle>{classItem.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`/teacher/classes/${classItem.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View class →
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

