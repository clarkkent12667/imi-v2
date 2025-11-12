import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const yearGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  displayOrder: z.number().int().optional(),
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
    const validated = yearGroupSchema.parse(body)

    const updateData: any = { name: validated.name }
    if (validated.displayOrder !== undefined) {
      updateData.display_order = validated.displayOrder
    }

    const { data, error } = await supabase
      .from('year_groups')
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

    // Check if any students are using this year group
    const { data: students, error: checkError } = await supabase
      .from('students')
      .select('id')
      .eq('year_group_id', id)
      .limit(1)

    if (checkError) throw checkError

    if (students && students.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete year group that is assigned to students' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('year_groups').delete().eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

