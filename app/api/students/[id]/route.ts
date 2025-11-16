import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { studentSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, school_year_group')
      .eq('id', id)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const body = await request.json()
    const validated = studentSchema.parse(body)
    const { id } = await params

    // Get year group name for backward compatibility
    const { data: yearGroup } = await supabase
      .from('year_groups')
      .select('name')
      .eq('id', validated.yearGroupId)
      .single()

    const { data, error } = await supabase
      .from('students')
      .update({
        full_name: validated.fullName,
        year_group_id: validated.yearGroupId,
        school_year_group: yearGroup?.name || '', // Keep for backward compatibility
        parent_name: validated.parentName || null,
        parent_email: validated.parentEmail || null,
        parent_phone: validated.parentPhone || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
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

    const { error } = await supabase.from('students').delete().eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

