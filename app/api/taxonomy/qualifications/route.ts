import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { qualificationSchema } from '@/lib/validations'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('qualifications')
      .select('*')
      .order('name')

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
    const validated = qualificationSchema.parse(body)

    const { data, error } = await supabase
      .from('qualifications')
      .insert({ name: validated.name })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

