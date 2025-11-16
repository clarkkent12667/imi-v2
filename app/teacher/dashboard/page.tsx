import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, BookOpen, Clock, TrendingUp, FileText } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { cache } from 'react'

// Cache work records query
const getTeacherWorkRecordsStats = cache(async (supabase: any, teacherId: string) => {
  return await supabase
    .from('work_records')
    .select('marks_obtained, total_marks, percentage')
    .eq('teacher_id', teacherId)
    .limit(500) // Reduced from 1000 for better performance
})

export default async function TeacherDashboardPage() {
  const user = await requireAuth('teacher')
  const supabase = await createClient()

  // Get teacher's classes
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .eq('teacher_id', user.id)

  const classIds = classes?.map((c) => c.id) || []

  // Get counts and additional data
  const [
    studentsResult,
    workRecordsResult,
    workRecordsData,
    recentWorkRecords,
    upcomingDueDates,
  ] = await Promise.all([
    supabase
      .from('class_students')
      .select('student_id', { count: 'exact', head: true })
      .in('class_id', classIds),
    supabase
      .from('work_records')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', user.id),
    getTeacherWorkRecordsStats(supabase, user.id),
    supabase
      .from('work_records')
      .select(
        `
        id,
        work_title,
        work_type,
        assigned_date,
        due_date,
        percentage,
        classes(name),
        students(full_name),
        subjects(name)
      `
      )
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('work_records')
      .select(
        `
        id,
        work_title,
        due_date,
        classes(name),
        students(full_name),
        subjects(name)
      `
      )
      .eq('teacher_id', user.id)
      .gte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(5),
  ])

  // Calculate average percentage
  const averagePercentage =
    workRecordsData.data && workRecordsData.data.length > 0
      ? workRecordsData.data.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) /
        workRecordsData.data.length
      : 0

  const stats = [
    {
      title: 'My Classes',
      value: classes?.length || 0,
      icon: Calendar,
      description: 'Classes assigned to you',
      href: '/teacher/classes',
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
      href: '/teacher/classes',
    },
    {
      title: 'Avg. Score',
      value: averagePercentage.toFixed(1) + '%',
      icon: TrendingUp,
      description: 'Average percentage',
      href: '/teacher/analytics',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.fullName}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          const content = (
            <Card key={stat.title} className={stat.href ? 'hover:bg-muted/50 transition-colors cursor-pointer' : ''}>
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
          return stat.href ? (
            <Link key={stat.title} href={stat.href} prefetch={true}>
              {content}
            </Link>
          ) : (
            content
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Recent Work Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Work Records
            </CardTitle>
            <CardDescription>Your latest work records</CardDescription>
          </CardHeader>
          <CardContent>
            {recentWorkRecords.data && recentWorkRecords.data.length > 0 ? (
              <div className="space-y-3">
                {recentWorkRecords.data.map((record: any) => (
                  <div key={record.id} className="border-b pb-2 last:border-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{record.work_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.classes?.name} • {record.students?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {record.subjects?.name} • {record.work_type}
                        </p>
                      </div>
                      {record.percentage !== null && (
                        <span className="text-sm font-semibold text-primary ml-2">
                          {Number(record.percentage).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assigned: {format(new Date(record.assigned_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No work records yet</p>
            )}
            {classes && classes.length > 0 && (
              <Link href="/teacher/classes" prefetch={true} className="text-sm text-primary hover:underline mt-4 block">
                View all classes →
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Due Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Due Dates
            </CardTitle>
            <CardDescription>Work records due soon</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDueDates.data && upcomingDueDates.data.length > 0 ? (
              <div className="space-y-3">
                {upcomingDueDates.data.map((record: any) => {
                  const dueDate = new Date(record.due_date)
                  const today = new Date()
                  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  const isOverdue = daysUntilDue < 0
                  const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0

                  return (
                    <div key={record.id} className="border-b pb-2 last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{record.work_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {record.classes?.name} • {record.students?.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{record.subjects?.name}</p>
                        </div>
                        <span
                          className={`text-xs font-semibold ml-2 ${
                            isOverdue
                              ? 'text-red-600'
                              : isDueSoon
                                ? 'text-orange-600'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {isOverdue
                            ? `${Math.abs(daysUntilDue)}d overdue`
                            : isDueSoon
                              ? `Due in ${daysUntilDue}d`
                              : format(dueDate, 'MMM d')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {format(dueDate, 'MMM d, yyyy')}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming due dates</p>
            )}
            {classes && classes.length > 0 && (
              <Link href="/teacher/classes" prefetch={true} className="text-sm text-primary hover:underline mt-4 block">
                View all classes →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {classes && classes.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Your Classes</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <Link key={classItem.id} href={`/teacher/classes/${classItem.id}`} prefetch={true}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle>{classItem.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-primary hover:underline">View class →</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
