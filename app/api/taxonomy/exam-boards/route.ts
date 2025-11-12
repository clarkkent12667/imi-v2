import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { examBoardSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const qualificationId = searchParams.get('qualification_id')

    let query = supabase.from('exam_boards').select('*').order('name')

    if (qualificationId) {
      query = query.eq('qualification_id', qualificationId)
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
    const validated = examBoardSchema.parse(body)

    const { data, error } = await supabase
      .from('exam_boards')
      .insert({
        name: validated.name,
        qualification_id: validated.qualificationId,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

