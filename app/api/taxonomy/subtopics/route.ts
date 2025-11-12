import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { subtopicSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const topicId = searchParams.get('topic_id')

    let query = supabase.from('subtopics').select('*').order('name')

    if (topicId) {
      query = query.eq('topic_id', topicId)
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
    const validated = subtopicSchema.parse(body)

    const { data, error } = await supabase
      .from('subtopics')
      .insert({
        name: validated.name,
        topic_id: validated.topicId,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

