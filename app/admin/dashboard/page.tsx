import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, GraduationCap, BookOpen, Calendar } from 'lucide-react'

export default async function AdminDashboardPage() {
  await requireAuth('admin')
  const supabase = await createClient()

  // Get counts
  const [teachersResult, studentsResult, classesResult, taxonomyResult] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('classes').select('id', { count: 'exact', head: true }),
    supabase.from('qualifications').select('id', { count: 'exact', head: true }),
  ])

  const stats = [
    {
      title: 'Teachers',
      value: teachersResult.count || 0,
      icon: Users,
      description: 'Total teachers',
    },
    {
      title: 'Students',
      value: studentsResult.count || 0,
      icon: GraduationCap,
      description: 'Total students',
    },
    {
      title: 'Classes',
      value: classesResult.count || 0,
      icon: Calendar,
      description: 'Active classes',
    },
    {
      title: 'Qualifications',
      value: taxonomyResult.count || 0,
      icon: BookOpen,
      description: 'In taxonomy',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your educational management system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
    </div>
  )
}

