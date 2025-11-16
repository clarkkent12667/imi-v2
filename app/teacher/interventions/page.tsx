import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
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
import CompleteInterventionButton from '@/components/admin/complete-intervention-button'
import { MessageSquare, Phone, Users } from 'lucide-react'
import { cache } from 'react'

const getTeacherClasses = cache(async (supabase: any, teacherId: string) => {
  const { data, error } = await supabase
    .from('classes')
    .select('id')
    .eq('teacher_id', teacherId)

  if (error) throw error
  return data?.map((c: any) => c.id) || []
})

const getInterventions = cache(async (supabase: any, classIds: string[]) => {
  // Get student IDs from teacher's classes
  const { data: classStudents, error: csError } = await supabase
    .from('class_students')
    .select('student_id')
    .in('class_id', classIds)

  if (csError) throw csError

  const studentIds = classStudents?.map((cs: any) => cs.student_id) || []
  
  if (studentIds.length === 0) return []

  const { data, error } = await supabase
    .from('student_interventions')
    .select(`
      id,
      flag_count,
      action_type,
      status,
      low_points_count,
      created_at,
      completed_at,
      notes,
      students (
        id,
        full_name,
        parent_name,
        parent_email,
        parent_phone,
        year_groups (name)
      ),
      users!student_interventions_created_by_fkey (
        id,
        full_name
      )
    `)
    .in('student_id', studentIds)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
})

const getLowPointsSummary = cache(async (supabase: any, classIds: string[]) => {
  // Get student IDs from teacher's classes
  const { data: classStudents, error: csError } = await supabase
    .from('class_students')
    .select('student_id')
    .in('class_id', classIds)

  if (csError) throw csError

  const studentIds = classStudents?.map((cs: any) => cs.student_id) || []
  
  if (studentIds.length === 0) return {}

  const { data, error } = await supabase
    .from('student_low_points')
    .select('student_id')
    .in('student_id', studentIds)
  
  if (error) throw error
  
  // Count low points per student
  const counts: Record<string, number> = {}
  data?.forEach((lp: any) => {
    counts[lp.student_id] = (counts[lp.student_id] || 0) + 1
  })
  
  return counts
})

export default async function TeacherInterventionsPage() {
  const user = await requireAuth('teacher')
  const supabase = await createClient()
  
  const classIds = await getTeacherClasses(supabase, user.id)
  const [interventions, lowPointsSummary] = await Promise.all([
    getInterventions(supabase, classIds),
    getLowPointsSummary(supabase, classIds),
  ])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />
      case 'call':
        return <Phone className="h-4 w-4" />
      case 'meeting':
        return <Users className="h-4 w-4" />
      default:
        return null
    }
  }

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'message':
        return 'default'
      case 'call':
        return 'secondary'
      case 'meeting':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const pendingInterventions = interventions.filter((i: any) => i.status === 'pending')
  const completedInterventions = interventions.filter((i: any) => i.status === 'completed')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Interventions</h1>
        <p className="text-muted-foreground">
          Track student low points and parent communication for your classes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Interventions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInterventions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Message Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingInterventions.filter((i: any) => i.action_type === 'message').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Call Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingInterventions.filter((i: any) => i.action_type === 'call').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Meeting Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingInterventions.filter((i: any) => i.action_type === 'meeting').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Interventions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pending Interventions</CardTitle>
          <CardDescription>
            Students requiring parent communication
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingInterventions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No pending interventions
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Year Group</TableHead>
                    <TableHead>Low Points</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Action Required</TableHead>
                    <TableHead>Parent Contact</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInterventions.map((intervention: any) => {
                    const student = intervention.students
                    const lowPoints = lowPointsSummary[student?.id] || 0
                    
                    return (
                      <TableRow key={intervention.id}>
                        <TableCell className="font-medium">
                          {student?.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {student?.year_groups?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{lowPoints}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{intervention.flag_count} Flag{intervention.flag_count > 1 ? 's' : ''}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(intervention.action_type) as any}>
                            <span className="flex items-center gap-1">
                              {getActionIcon(intervention.action_type)}
                              {intervention.action_type.charAt(0).toUpperCase() + intervention.action_type.slice(1)} Parent
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {student?.parent_name && (
                              <div>{student.parent_name}</div>
                            )}
                            {student?.parent_email && (
                              <div className="text-muted-foreground">{student.parent_email}</div>
                            )}
                            {student?.parent_phone && (
                              <div className="text-muted-foreground">{student.parent_phone}</div>
                            )}
                            {!student?.parent_name && !student?.parent_email && !student?.parent_phone && (
                              <span className="text-muted-foreground">No contact info</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(intervention.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <CompleteInterventionButton interventionId={intervention.id} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Interventions */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Interventions</CardTitle>
          <CardDescription>
            Recently completed parent communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedInterventions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No completed interventions
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedInterventions.slice(0, 10).map((intervention: any) => (
                    <TableRow key={intervention.id}>
                      <TableCell className="font-medium">
                        {intervention.students?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(intervention.action_type) as any}>
                          {intervention.action_type.charAt(0).toUpperCase() + intervention.action_type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {intervention.completed_at
                          ? new Date(intervention.completed_at).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {intervention.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

