import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const { id } = await params

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select(`
        *,
        users!classes_teacher_id_fkey(id, full_name, email),
        subjects(id, name),
        year_groups(id, name),
        class_students(
          student_id,
          students(id, full_name, school_year_group)
        )
      `)
      .eq('id', id)
      .single()

    if (classError) throw classError

    return NextResponse.json(classData)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const { id } = await params

    const { error } = await supabase.from('classes').delete().eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bad request'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}

