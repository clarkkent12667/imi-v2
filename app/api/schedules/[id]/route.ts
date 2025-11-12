import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const updateScheduleSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  teacherId: z.string().uuid('Invalid teacher ID').optional(),
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
    const validated = updateScheduleSchema.parse(body)

    // Update schedule
    const updateData: any = {
      day_of_week: validated.dayOfWeek,
      start_time: validated.startTime,
      end_time: validated.endTime,
    }

    const { error: scheduleError } = await supabase
      .from('class_schedules')
      .update(updateData)
      .eq('id', id)

    if (scheduleError) throw scheduleError

    // If teacher is being changed, update the class
    if (validated.teacherId) {
      const { error: classError } = await supabase
        .from('classes')
        .update({ teacher_id: validated.teacherId })
        .eq('id', validated.classId)

      if (classError) throw classError
    }

    return NextResponse.json({ success: true })
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

    const { error } = await supabase.from('class_schedules').delete().eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

