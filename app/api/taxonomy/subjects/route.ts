import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { subjectSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const examBoardId = searchParams.get('exam_board_id')

    let query = supabase.from('subjects').select('*').order('name')

    if (examBoardId) {
      query = query.eq('exam_board_id', examBoardId)
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
    const validated = subjectSchema.parse(body)

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name: validated.name,
        exam_board_id: validated.examBoardId,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

