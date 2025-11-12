import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const classId = searchParams.get('class_id')
    const studentId = searchParams.get('student_id')

    let workRecordsQuery = supabase
      .from('work_records')
      .select('marks_obtained, total_marks, percentage, work_type, assigned_date, subject_id, subjects(name)')

    if (user.role === 'teacher') {
      workRecordsQuery = workRecordsQuery.eq('teacher_id', user.id)
    }

    if (classId) {
      workRecordsQuery = workRecordsQuery.eq('class_id', classId)
    }

    if (studentId) {
      workRecordsQuery = workRecordsQuery.eq('student_id', studentId)
    }

    const { data: workRecords, error } = await workRecordsQuery

    if (error) throw error

    // Calculate analytics
    const totalRecords = workRecords?.length || 0
    const averagePercentage =
      workRecords && workRecords.length > 0
        ? workRecords.reduce((sum, r) => sum + (r.percentage || 0), 0) / workRecords.length
        : 0

    const homeworkCount = workRecords?.filter((r) => r.work_type === 'homework').length || 0
    const classworkCount = workRecords?.filter((r) => r.work_type === 'classwork').length || 0

    // Performance by subject
    const subjectPerformance: Record<string, { name: string; count: number; average: number }> =
      {}
    workRecords?.forEach((record) => {
      const subjects = record.subjects
      let subjectName = 'Unknown'
      if (subjects && !Array.isArray(subjects) && typeof subjects === 'object' && 'name' in subjects) {
        subjectName = (subjects as { name: string }).name || 'Unknown'
      }
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = { name: subjectName, count: 0, average: 0 }
      }
      subjectPerformance[subjectName].count++
      subjectPerformance[subjectName].average += record.percentage || 0
    })

    Object.keys(subjectPerformance).forEach((key) => {
      subjectPerformance[key].average /= subjectPerformance[key].count
    })

    // Performance over time (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentRecords = workRecords?.filter(
      (r) => new Date(r.assigned_date) >= thirtyDaysAgo
    ) || []

    const performanceOverTime = recentRecords.map((r) => ({
      date: r.assigned_date,
      percentage: r.percentage || 0,
    }))

    return NextResponse.json({
      totalRecords,
      averagePercentage,
      homeworkCount,
      classworkCount,
      subjectPerformance: Object.values(subjectPerformance),
      performanceOverTime,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

