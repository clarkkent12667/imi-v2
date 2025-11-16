import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { studentSchema } from '@/lib/validations'

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await requireAuth('admin')
    
    const { data, error } = await supabase
      .from('students')
      .select(`
        id, 
        full_name, 
        school_year_group,
        year_group_id,
        parent_name,
        parent_email,
        parent_phone,
        created_at,
        year_groups (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Transform data to include year group name
    const transformed = data?.map((student: any) => ({
      ...student,
      year_group_name: student.year_groups?.name || student.school_year_group || 'N/A',
    })) || []
    
    return NextResponse.json(transformed)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth('admin')
    const supabase = await createClient()
    const body = await request.json()
    const validated = studentSchema.parse(body)

    // Get year group name for backward compatibility
    const { data: yearGroup } = await supabase
      .from('year_groups')
      .select('name')
      .eq('id', validated.yearGroupId)
      .single()

    const { data, error } = await supabase
      .from('students')
      .insert({
        full_name: validated.fullName,
        year_group_id: validated.yearGroupId,
        school_year_group: yearGroup?.name || '', // Keep for backward compatibility
        parent_name: validated.parentName || null,
        parent_email: validated.parentEmail || null,
        parent_phone: validated.parentPhone || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

