import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { cache } from 'react'

// Lazy load chart component to reduce initial bundle size
const AnalyticsCharts = dynamic(() => import('@/components/admin/analytics-charts'), {
  loading: () => (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        Loading charts...
      </CardContent>
    </Card>
  ),
  ssr: false, // Charts don't need SSR
})

// Cache analytics query per request
const getAnalytics = cache(async () => {
  const supabase = await createClient()
  
  // Fetch comprehensive analytics data
  const { data: workRecords, error } = await supabase
    .from('work_records')
    .select(`
      id,
      marks_obtained,
      total_marks,
      percentage,
      work_type,
      status,
      assigned_date,
      due_date,
      subject_id,
      topic_id,
      subtopic_id,
      class_id,
      student_id,
      teacher_id,
      subjects(name),
      topics(name),
      subtopics(name),
      classes(name, year_group_id, department_id),
      students(id, full_name, year_group_id),
      year_groups!classes_year_group_id_fkey(name),
      departments!classes_department_id_fkey(name)
    `)
    .limit(5000) // Increased limit for comprehensive analytics
  
  if (error) {
    console.error('Error fetching analytics:', error)
    return null
  }
  
  // Calculate basic metrics
  const totalRecords = workRecords?.length || 0
  const averagePercentage =
    workRecords && workRecords.length > 0
      ? workRecords.reduce((sum, r) => sum + (r.percentage || 0), 0) / workRecords.length
      : 0
  
  // Work type breakdown
  const homeworkCount = workRecords?.filter((r) => r.work_type === 'homework').length || 0
  const classworkCount = workRecords?.filter((r) => r.work_type === 'classwork').length || 0
  const pastPaperCount = workRecords?.filter((r) => r.work_type === 'past_paper').length || 0
  
  // Work status breakdown
  const notSubmittedCount = workRecords?.filter((r) => r.status === 'not_submitted').length || 0
  const submittedCount = workRecords?.filter((r) => r.status === 'submitted').length || 0
  const resitCount = workRecords?.filter((r) => r.status === 'resit').length || 0
  const reAssignedCount = workRecords?.filter((r) => r.status === 're_assigned').length || 0
  
  // Performance by subject
  const subjectPerformance: Record<string, { name: string; count: number; average: number }> = {}
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
  
  // Performance by year group
  const yearGroupPerformance: Record<string, { name: string; count: number; average: number }> = {}
  workRecords?.forEach((record) => {
    const yearGroup = record.year_groups
    let yearGroupName = 'Unknown'
    if (yearGroup && !Array.isArray(yearGroup) && typeof yearGroup === 'object' && 'name' in yearGroup) {
      yearGroupName = (yearGroup as { name: string }).name || 'Unknown'
    }
    if (!yearGroupPerformance[yearGroupName]) {
      yearGroupPerformance[yearGroupName] = { name: yearGroupName, count: 0, average: 0 }
    }
    yearGroupPerformance[yearGroupName].count++
    yearGroupPerformance[yearGroupName].average += record.percentage || 0
  })
  
  Object.keys(yearGroupPerformance).forEach((key) => {
    yearGroupPerformance[key].average /= yearGroupPerformance[key].count
  })
  
  // Performance by work type
  const workTypePerformance: Record<string, { name: string; count: number; average: number }> = {}
  workRecords?.forEach((record) => {
    const workType = record.work_type || 'unknown'
    if (!workTypePerformance[workType]) {
      workTypePerformance[workType] = { name: workType, count: 0, average: 0 }
    }
    workTypePerformance[workType].count++
    workTypePerformance[workType].average += record.percentage || 0
  })
  
  Object.keys(workTypePerformance).forEach((key) => {
    workTypePerformance[key].average /= workTypePerformance[key].count
  })
  
  // Performance by department
  const departmentPerformance: Record<string, { name: string; count: number; average: number }> = {}
  workRecords?.forEach((record) => {
    const department = record.departments
    let departmentName = 'No Department'
    if (department && !Array.isArray(department) && typeof department === 'object' && 'name' in department) {
      departmentName = (department as { name: string }).name || 'No Department'
    }
    if (!departmentPerformance[departmentName]) {
      departmentPerformance[departmentName] = { name: departmentName, count: 0, average: 0 }
    }
    departmentPerformance[departmentName].count++
    departmentPerformance[departmentName].average += record.percentage || 0
  })
  
  Object.keys(departmentPerformance).forEach((key) => {
    departmentPerformance[key].average /= departmentPerformance[key].count
  })
  
  // Teacher performance
  const teacherPerformance: Record<string, { name: string; id: string; count: number; average: number }> = {}
  const { data: teachers } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('role', 'teacher')
  
  workRecords?.forEach((record) => {
    const teacherId = record.teacher_id
    const teacher = teachers?.find((t) => t.id === teacherId)
    const teacherName = teacher?.full_name || 'Unknown Teacher'
    
    if (!teacherPerformance[teacherId]) {
      teacherPerformance[teacherId] = { name: teacherName, id: teacherId, count: 0, average: 0 }
    }
    teacherPerformance[teacherId].count++
    teacherPerformance[teacherId].average += record.percentage || 0
  })
  
  Object.keys(teacherPerformance).forEach((key) => {
    teacherPerformance[key].average /= teacherPerformance[key].count
  })
  
  // Class performance
  const classPerformance: Record<string, { name: string; count: number; average: number }> = {}
  workRecords?.forEach((record) => {
    const classData = record.classes
    let className = 'Unknown'
    if (classData && !Array.isArray(classData) && typeof classData === 'object' && 'name' in classData) {
      className = (classData as { name: string }).name || 'Unknown'
    }
    if (!classPerformance[className]) {
      classPerformance[className] = { name: className, count: 0, average: 0 }
    }
    classPerformance[className].count++
    classPerformance[className].average += record.percentage || 0
  })
  
  Object.keys(classPerformance).forEach((key) => {
    classPerformance[key].average /= classPerformance[key].count
  })
  
  // Sort classes by average (descending) and get top/bottom
  const sortedClasses = Object.values(classPerformance).sort((a, b) => b.average - a.average)
  const topClasses = sortedClasses.slice(0, 5)
  const bottomClasses = sortedClasses.slice(-5).reverse()
  
  // Performance over time (last 30 days, grouped by week)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentRecords = workRecords?.filter(
    (r) => new Date(r.assigned_date) >= thirtyDaysAgo
  ) || []
  
  // Group by week
  const weeklyPerformance: Record<string, { week: string; count: number; average: number }> = {}
  recentRecords.forEach((r) => {
    const date = new Date(r.assigned_date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0]
    
    if (!weeklyPerformance[weekKey]) {
      weeklyPerformance[weekKey] = { week: weekKey, count: 0, average: 0 }
    }
    weeklyPerformance[weekKey].count++
    weeklyPerformance[weekKey].average += r.percentage || 0
  })
  
  Object.keys(weeklyPerformance).forEach((key) => {
    weeklyPerformance[key].average /= weeklyPerformance[key].count
  })
  
  const performanceOverTime = Object.values(weeklyPerformance)
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((item) => ({
      date: new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      percentage: item.average,
    }))
  
  // Monthly performance (last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const monthlyRecords = workRecords?.filter(
    (r) => new Date(r.assigned_date) >= sixMonthsAgo
  ) || []
  
  const monthlyPerformance: Record<string, { month: string; count: number; average: number }> = {}
  monthlyRecords.forEach((r) => {
    const date = new Date(r.assigned_date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthlyPerformance[monthKey]) {
      monthlyPerformance[monthKey] = { month: monthKey, count: 0, average: 0 }
    }
    monthlyPerformance[monthKey].count++
    monthlyPerformance[monthKey].average += r.percentage || 0
  })
  
  Object.keys(monthlyPerformance).forEach((key) => {
    monthlyPerformance[key].average /= monthlyPerformance[key].count
  })
  
  const monthlyTrends = Object.values(monthlyPerformance)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item) => ({
      month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      percentage: item.average,
    }))
  
  // Student engagement (students with most/least work records)
  const studentEngagement: Record<string, { name: string; count: number; average: number }> = {}
  workRecords?.forEach((record) => {
    const student = record.students
    const studentId = record.student_id
    const studentName = (student && !Array.isArray(student) && typeof student === 'object' && 'full_name' in student)
      ? (student as { full_name: string }).full_name
      : 'Unknown'
    
    if (!studentEngagement[studentId]) {
      studentEngagement[studentId] = { name: studentName, count: 0, average: 0 }
    }
    studentEngagement[studentId].count++
    studentEngagement[studentId].average += record.percentage || 0
  })
  
  Object.keys(studentEngagement).forEach((key) => {
    studentEngagement[key].average /= studentEngagement[key].count
  })
  
  const sortedStudents = Object.values(studentEngagement).sort((a, b) => b.count - a.count)
  const mostActiveStudents = sortedStudents.slice(0, 10)
  const leastActiveStudents = sortedStudents.slice(-10).reverse()
  
  // Topic coverage
  const topicCoverage: Record<string, { name: string; count: number; average: number }> = {}
  workRecords?.forEach((record) => {
    const topic = record.topics
    if (topic && !Array.isArray(topic) && typeof topic === 'object' && 'name' in topic) {
      const topicName = (topic as { name: string }).name
      if (!topicCoverage[topicName]) {
        topicCoverage[topicName] = { name: topicName, count: 0, average: 0 }
      }
      topicCoverage[topicName].count++
      topicCoverage[topicName].average += record.percentage || 0
    }
  })
  
  Object.keys(topicCoverage).forEach((key) => {
    topicCoverage[key].average /= topicCoverage[key].count
  })
  
  const sortedTopics = Object.values(topicCoverage).sort((a, b) => b.count - a.count)
  const topTopics = sortedTopics.slice(0, 10)
  
  return {
    totalRecords,
    averagePercentage,
    homeworkCount,
    classworkCount,
    pastPaperCount,
    notSubmittedCount,
    submittedCount,
    resitCount,
    reAssignedCount,
    subjectPerformance: Object.values(subjectPerformance),
    yearGroupPerformance: Object.values(yearGroupPerformance),
    workTypePerformance: Object.values(workTypePerformance),
    departmentPerformance: Object.values(departmentPerformance),
    teacherPerformance: Object.values(teacherPerformance).slice(0, 10), // Top 10 teachers
    topClasses,
    bottomClasses,
    performanceOverTime,
    monthlyTrends,
    mostActiveStudents,
    leastActiveStudents,
    topTopics,
  }
})

export default async function AdminAnalyticsPage() {
  await requireAuth('admin')
  const analytics = await getAnalytics()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Overview of system performance and metrics</p>
      </div>

      {!analytics ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No analytics data available
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalRecords}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.averagePercentage.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Homework</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.homeworkCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Classwork</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.classworkCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Past Papers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.pastPaperCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Submitted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.submittedCount}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.totalRecords > 0
                    ? ((analytics.submittedCount / analytics.totalRecords) * 100).toFixed(1)
                    : 0}% submission rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Not Submitted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.notSubmittedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Resits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.resitCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Re-assigned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.reAssignedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Submission Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.totalRecords > 0
                    ? ((analytics.submittedCount / analytics.totalRecords) * 100).toFixed(1)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Suspense fallback={
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading charts...
              </CardContent>
            </Card>
          }>
            <AnalyticsCharts analytics={analytics} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
