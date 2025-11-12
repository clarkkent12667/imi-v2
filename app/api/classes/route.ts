import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { classSchema } from '@/lib/validations'

export async function GET() {
  try {
    const user = await requireAuth('admin')
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        teacher_id,
        created_by,
        created_at,
        users!classes_teacher_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

