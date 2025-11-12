import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { classSchema } from '@/lib/validations'

export async function GET() {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    
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
    return NextResponse.json(data)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth('admin')
    const supabase = await createClient()
    const body = await request.json()
    const validated = classSchema.parse(body)

    // Create class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .insert({
        name: validated.name,
        teacher_id: validated.teacherId,
        created_by: user.id,
        subject_id: validated.subjectId || null,
        year_group_id: validated.yearGroupId || null,
      })
      .select()
      .single()

    if (classError) throw classError

    // Add students to class
    if (validated.studentIds.length > 0) {
      const classStudents = validated.studentIds.map((studentId) => ({
        class_id: classData.id,
        student_id: studentId,
      }))

      const { error: studentsError } = await supabase
        .from('class_students')
        .insert(classStudents)

      if (studentsError) throw studentsError
    }

    return NextResponse.json(classData, { status: 201 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bad request'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}

