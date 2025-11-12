import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const departmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const validated = departmentSchema.parse(body)

    const updateData: any = { name: validated.name }

    const { data, error } = await supabase
      .from('departments')
      .update(updateData)
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

    // Check if any classes are using this department
    const { data: classes, error: checkError } = await supabase
      .from('classes')
      .select('id')
      .eq('department_id', id)
      .limit(1)

    if (checkError) throw checkError

    if (classes && classes.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department that is assigned to classes' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('departments').delete().eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

