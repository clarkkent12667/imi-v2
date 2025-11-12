import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

// GET: Get all teachers in a department
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('user_departments')
      .select(`
        user_id,
        users (
          id,
          full_name,
          email
        )
      `)
      .eq('department_id', id)

    if (error) throw error

    // Transform the data to a simpler format
    const teachers = data?.map((item: any) => item.users).filter(Boolean) || []

    return NextResponse.json(teachers)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Add a teacher to a department
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if teacher is already in department
    const { data: existing } = await supabase
      .from('user_departments')
      .select('user_id')
      .eq('department_id', id)
      .eq('user_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Teacher is already in this department' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_departments')
      .insert({
        user_id: userId,
        department_id: id,
      })
      .select(`
        user_id,
        users (
          id,
          full_name,
          email
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json(data.users, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// DELETE: Remove a teacher from a department
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_departments')
      .delete()
      .eq('department_id', id)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

