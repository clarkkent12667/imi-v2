import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, GraduationCap, BookOpen, Calendar, Building2, Layers, FileText, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function AdminDashboardPage() {
  await requireAuth('admin')
  const supabase = await createClient()

  // Get counts and additional data
  const [
    teachersResult,
    studentsResult,
    classesResult,
    taxonomyResult,
    departmentsResult,
    yearGroupsResult,
    workRecordsResult,
    recentWorkRecords,
    upcomingDueDates,
    recentStudents,
    recentTeachers,
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('classes').select('id', { count: 'exact', head: true }),
    supabase.from('qualifications').select('id', { count: 'exact', head: true }),
    supabase.from('departments').select('id', { count: 'exact', head: true }),
    supabase.from('year_groups').select('id', { count: 'exact', head: true }),
    supabase
      .from('work_records')
      .select('marks_obtained, total_marks, percentage')
      .limit(1000),
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
        students(full_name)
      `
      )
      .gte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('students')
      .select('id, full_name, school_year_group, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('users')
      .select('id, full_name, email, created_at')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Calculate work records statistics
  const totalWorkRecords = workRecordsResult.data?.length || 0
  const averagePercentage =
    workRecordsResult.data && workRecordsResult.data.length > 0
      ? workRecordsResult.data.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) /
        workRecordsResult.data.length
      : 0

  const stats = [
    {
      title: 'Teachers',
      value: teachersResult.count || 0,
      icon: Users,
      description: 'Total teachers',
      href: '/admin/users',
    },
    {
      title: 'Students',
      value: studentsResult.count || 0,
      icon: GraduationCap,
      description: 'Total students',
      href: '/admin/students',
    },
    {
      title: 'Classes',
      value: classesResult.count || 0,
      icon: Calendar,
      description: 'Active classes',
      href: '/admin/classes',
    },
    {
      title: 'Qualifications',
      value: taxonomyResult.count || 0,
      icon: BookOpen,
      description: 'In taxonomy',
      href: '/admin/taxonomy',
    },
    {
      title: 'Departments',
      value: departmentsResult.count || 0,
      icon: Building2,
      description: 'Total departments',
      href: '/admin/departments',
    },
    {
      title: 'Year Groups',
      value: yearGroupsResult.count || 0,
      icon: Layers,
      description: 'Active year groups',
      href: '/admin/year-groups',
    },
    {
      title: 'Work Records',
      value: totalWorkRecords,
      icon: FileText,
      description: 'Total records',
      href: '/admin/reports',
    },
    {
      title: 'Avg. Score',
      value: averagePercentage.toFixed(1) + '%',
      icon: TrendingUp,
      description: 'Average percentage',
      href: '/admin/analytics',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your educational management system</p>
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
            <Link key={stat.title} href={stat.href}>
              {content}
            </Link>
          ) : (
            content
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Work Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Work Records
            </CardTitle>
            <CardDescription>Latest work records created</CardDescription>
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
            <Link href="/admin/reports" className="text-sm text-primary hover:underline mt-4 block">
              View all reports →
            </Link>
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
            <Link href="/admin/reports" className="text-sm text-primary hover:underline mt-4 block">
              View all reports →
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest additions to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Recent Students */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Recent Students
                </h4>
                {recentStudents.data && recentStudents.data.length > 0 ? (
                  <div className="space-y-2">
                    {recentStudents.data.map((student: any) => (
                      <div key={student.id} className="text-sm">
                        <p className="font-medium">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.school_year_group} • {format(new Date(student.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No recent students</p>
                )}
              </div>

              {/* Recent Teachers */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Recent Teachers
                </h4>
                {recentTeachers.data && recentTeachers.data.length > 0 ? (
                  <div className="space-y-2">
                    {recentTeachers.data.map((teacher: any) => (
                      <div key={teacher.id} className="text-sm">
                        <p className="font-medium">{teacher.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {teacher.email} • {format(new Date(teacher.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No recent teachers</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
