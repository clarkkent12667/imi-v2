import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const yearGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  displayOrder: z.number().int().optional().default(0),
})

export async function GET() {
  try {
    const supabase = await createClient()
    // Allow authenticated users to view year groups (needed for dropdowns)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('year_groups')
      .select('id, name, display_order')
      .order('display_order', { ascending: true })

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
    const validated = yearGroupSchema.parse(body)

    const { data, error } = await supabase
      .from('year_groups')
      .insert({
        name: validated.name,
        display_order: validated.displayOrder,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

