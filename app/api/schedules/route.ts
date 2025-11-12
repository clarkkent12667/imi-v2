import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { scheduleSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const classId = searchParams.get('class_id')

    let query = supabase
      .from('class_schedules')
      .select(`
        *,
        classes (
          id,
          name,
          teacher_id,
          class_students (
            students (
              full_name
            )
          )
        )
      `)
      .order('day_of_week')
      .order('start_time')

    if (classId) {
      query = query.eq('class_id', classId)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const body = await request.json()
    const validated = scheduleSchema.parse(body)

    // Delete existing schedules for this class
    await supabase.from('class_schedules').delete().eq('class_id', validated.classId)

    // Insert new schedules
    const schedules = validated.schedules.map((schedule) => ({
      class_id: validated.classId,
      day_of_week: schedule.dayOfWeek,
      start_time: schedule.startTime,
      end_time: schedule.endTime,
    }))

    const { data, error } = await supabase
      .from('class_schedules')
      .insert(schedules)
      .select()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

