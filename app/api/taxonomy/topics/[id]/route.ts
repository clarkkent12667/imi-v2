import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { topicSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const body = await request.json()
    const validated = topicSchema.parse(body)
    const { id } = await params

    const { data, error } = await supabase
      .from('topics')
      .update({
        name: validated.name,
        subject_id: validated.subjectId,
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

    const { error } = await supabase.from('topics').delete().eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

