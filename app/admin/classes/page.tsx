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
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ClassesClient from '@/components/admin/classes-client'
import { cache } from 'react'
import DeleteClassButton from '@/components/admin/delete-class-button'

// Cache data fetching functions to avoid duplicate queries
const getClasses = cache(async (supabase: any) => {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      teacher_id,
      created_by,
      created_at,
      subject_id,
      year_group_id,
      users!classes_teacher_id_fkey(id, full_name, email),
      subjects(id, name),
      year_groups(id, name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
})

const getTeachers = cache(async (supabase: any) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, created_at')
    .eq('role', 'teacher')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
})

const getStudents = cache(async (supabase: any) => {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id, 
      full_name, 
      school_year_group,
      year_group_id,
      created_at,
      year_groups (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  
  // Transform data to include year group name
  return data?.map((student: any) => ({
    ...student,
    year_group_name: student.year_groups?.name || student.school_year_group || 'N/A',
  })) || []
})

const getSubjects = cache(async (supabase: any) => {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
})

const getYearGroups = cache(async (supabase: any) => {
  const { data, error } = await supabase
    .from('year_groups')
    .select('id, name, display_order')
    .order('display_order', { ascending: true })

  if (error) throw error
  return data || []
})

export default async function ClassesPage() {
  await requireAuth('admin')
  const supabase = await createClient()

  // Fetch all data in parallel server-side (no API calls!)
  const [classes, teachers, students, subjects, yearGroups] = await Promise.all([
    getClasses(supabase),
    getTeachers(supabase),
    getStudents(supabase),
    getSubjects(supabase),
    getYearGroups(supabase),
  ])

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Manage classes and assign teachers and students</p>
        </div>
        <ClassesClient
          teachers={teachers}
          students={students}
          subjects={subjects}
          yearGroups={yearGroups}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>List of all classes in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No classes found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Year Group</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classItem: any) => (
                  <TableRow key={classItem.id}>
                    <TableCell className="font-medium">{classItem.name}</TableCell>
                    <TableCell>{classItem.users?.full_name || 'N/A'}</TableCell>
                    <TableCell>{classItem.subjects?.name || 'N/A'}</TableCell>
                    <TableCell>{classItem.year_groups?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {classItem.created_at
                        ? new Date(classItem.created_at).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <DeleteClassButton classId={classItem.id} />
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
