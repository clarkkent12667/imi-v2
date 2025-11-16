'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Clock, Users, BookOpen, Building2, Filter, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface ClassSchedule {
  classId: string
  className: string
  teacherId: string
  teacherName: string
  subject: string
  yearGroup: string
  department: string
  departmentId: string | null
  startTime: string
  endTime: string
  dayOfWeek: number
  scheduleId: string
  studentCount: number
}

interface Teacher {
  id: string
  full_name: string
  email: string
}

interface Department {
  id: string
  name: string
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function getTimeSlotKey(startTime: string): number {
  const [hours, minutes] = startTime.split(':')
  return parseInt(hours, 10) * 60 + parseInt(minutes, 10)
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    dates.push(date)
  }
  return dates
}

export default function AdminSchedulePage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassSchedule[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay())
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch teachers
      const { data: teachersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'teacher')
        .order('full_name')

      // Fetch departments
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('id, name')
        .order('name')

      // Fetch classes with schedules
      const { data: classesData, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          teacher_id,
          department_id,
          subjects(id, name),
          year_groups(id, name),
          departments(id, name),
          users!classes_teacher_id_fkey(id, full_name, email),
          class_students(count),
          class_schedules(
            id,
            day_of_week,
            start_time,
            end_time
          )
        `)
        .order('name')

      if (error) {
        console.error('Error fetching classes:', error)
        return
      }

      // Transform data
      const schedules: ClassSchedule[] = []
      classesData?.forEach((classItem: any) => {
        if (classItem.class_schedules && classItem.class_schedules.length > 0) {
          classItem.class_schedules.forEach((schedule: any) => {
            schedules.push({
              classId: classItem.id,
              className: classItem.name,
              teacherId: classItem.teacher_id,
              teacherName: classItem.users?.full_name || 'N/A',
              subject: classItem.subjects?.name || 'N/A',
              yearGroup: classItem.year_groups?.name || 'N/A',
              department: classItem.departments?.name || 'N/A',
              departmentId: classItem.department_id,
              startTime: schedule.start_time,
              endTime: schedule.end_time,
              dayOfWeek: schedule.day_of_week,
              scheduleId: schedule.id,
              studentCount: classItem.class_students?.[0]?.count || 0,
            })
          })
        }
      })

      setTeachers(teachersData || [])
      setDepartments(departmentsData || [])
      setClasses(schedules)
      setLoading(false)
    }

    fetchData()
  }, [])

  // Filter classes based on selected filters
  const filteredClasses = classes.filter((schedule) => {
    if (selectedTeacher !== 'all' && schedule.teacherId !== selectedTeacher) {
      return false
    }
    if (selectedDepartment !== 'all' && schedule.departmentId !== selectedDepartment) {
      return false
    }
    if (viewMode === 'daily' && selectedDay !== null && schedule.dayOfWeek !== selectedDay) {
      return false
    }
    return true
  })

  // Organize by day for weekly view
  const scheduleByDay: Record<number, ClassSchedule[]> = {}
  for (let i = 0; i < 7; i++) {
    scheduleByDay[i] = []
  }

  filteredClasses.forEach((schedule) => {
    scheduleByDay[schedule.dayOfWeek].push(schedule)
  })

  // Sort each day's classes by start time
  Object.keys(scheduleByDay).forEach((day) => {
    scheduleByDay[parseInt(day)].sort(
      (a, b) => getTimeSlotKey(a.startTime) - getTimeSlotKey(b.startTime)
    )
  })

  // For daily view, get classes for selected day
  const dailyClasses = scheduleByDay[selectedDay] || []

  // Calculate week start date (Sunday)
  const weekStartDate = getStartOfWeek(selectedDate)
  const weekDates = getWeekDates(weekStartDate)

  // Navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    setSelectedDate(newDate)
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setSelectedDate(newDate)
    setSelectedDay(newDate.getDay())
  }

  const goToToday = () => {
    const today = new Date()
    setSelectedDate(today)
    setSelectedDay(today.getDay())
  }

  // Update selectedDay when selectedDate changes
  useEffect(() => {
    setSelectedDay(selectedDate.getDay())
  }, [selectedDate])

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0])
    }
  }

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importFile) {
      toast.error('Please select a file')
      return
    }

    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch('/api/classes/classcard-schedule-import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.errors && Array.isArray(result.errors)) {
          toast.error(`Import failed: ${result.errors.slice(0, 3).join(', ')}${result.errors.length > 3 ? '...' : ''}`)
        } else {
          toast.error(result.error || 'Import failed')
        }
        return
      }

      if (result.errorCount > 0) {
        toast.warning(`Sync completed with ${result.errorCount} errors. ${result.classesCreated} classes created, ${result.classesUpdated} classes updated, ${result.schedulesCreated} schedules synced.`)
      } else {
        toast.success(`Successfully synced! ${result.classesCreated} classes created, ${result.classesUpdated} classes updated, ${result.schedulesCreated} schedules synced.`)
      }

      setImportDialogOpen(false)
      setImportFile(null)
      
      // Refresh the page data by refetching
      setLoading(true)
      setTimeout(async () => {
        const supabase = createClient()
        
        // Refetch classes with schedules
        const { data: classesData, error } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            teacher_id,
            department_id,
            subjects(id, name),
            year_groups(id, name),
            departments(id, name),
            users!classes_teacher_id_fkey(id, full_name, email),
            class_students(count),
            class_schedules(
              id,
              day_of_week,
              start_time,
              end_time
            )
          `)
          .order('name')

        if (!error && classesData) {
          const schedules: ClassSchedule[] = []
          classesData.forEach((classItem: any) => {
            if (classItem.class_schedules && classItem.class_schedules.length > 0) {
              classItem.class_schedules.forEach((schedule: any) => {
                schedules.push({
                  classId: classItem.id,
                  className: classItem.name,
                  teacherId: classItem.teacher_id,
                  teacherName: classItem.users?.full_name || 'N/A',
                  subject: classItem.subjects?.name || 'N/A',
                  yearGroup: classItem.year_groups?.name || 'N/A',
                  department: classItem.departments?.name || 'N/A',
                  departmentId: classItem.department_id,
                  startTime: schedule.start_time,
                  endTime: schedule.end_time,
                  dayOfWeek: schedule.day_of_week,
                  scheduleId: schedule.id,
                  studentCount: classItem.class_students?.[0]?.count || 0,
                })
              })
            }
          })
          setClasses(schedules)
        }
        setLoading(false)
      }, 1000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to import schedule')
    } finally {
      setIsImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading schedule...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Class Schedule</h1>
          <p className="text-muted-foreground">View and manage class schedules across the system</p>
        </div>
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Import from ClassCard
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sync Schedule from ClassCard</DialogTitle>
              <DialogDescription>
                Upload a ClassCard schedule list export CSV file. This will automatically create classes if they don't exist, and sync schedules and students. Only rows with Attendance Status = "Marked" will be synced. Existing classes will have their students and schedules replaced to match ClassCard exactly.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import-file">ClassCard Schedule CSV File</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".csv"
                  onChange={handleImportFileChange}
                  required
                  disabled={isImporting}
                />
                <p className="text-sm text-muted-foreground">
                  CSV format: Date, Day, Time, Class Title, Class Subject, Students, Staff, Attendance Status (from ClassCard export)
                </p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4">
                <h3 className="mb-2 font-semibold">ClassCard Export Format:</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  The CSV should have columns: <strong>Date</strong>, <strong>Day</strong>, <strong>Time</strong>, <strong>Class Title</strong>, <strong>Class Subject</strong>, <strong>Students</strong>, <strong>Staff</strong>, <strong>Attendance Status</strong>
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Important:</strong>
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li><strong>Classes are automatically created</strong> if they don't exist (based on Class Title + Teacher + Subject)</li>
                  <li>Only rows where Attendance Status = "Marked" will be synced</li>
                  <li>Teachers and students must already exist in the system (import them first)</li>
                  <li>Subjects will be extracted from Class Title or Class Subject and matched to existing subjects</li>
                  <li>Year groups will be extracted from Class Title and matched to existing year groups</li>
                  <li>Classes are grouped by Class Title + Teacher</li>
                  <li><strong>For existing classes:</strong> All students and schedules will be replaced to match ClassCard exactly</li>
                  <li><strong>For new classes:</strong> Classes, students, and schedules will all be created automatically</li>
                </ul>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)} disabled={isImporting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!importFile || isImporting}>
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? 'Syncing...' : 'Sync Schedule'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Teacher</label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule View */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'daily' | 'weekly')}>
        <TabsList className="mb-6">
          <TabsTrigger value="weekly">
            <Calendar className="h-4 w-4 mr-2" />
            Weekly View
          </TabsTrigger>
          <TabsTrigger value="daily">
            <Calendar className="h-4 w-4 mr-2" />
            Daily View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Weekly Schedule</CardTitle>
                  <CardDescription>
                    {formatDate(weekStartDate)} - {formatDate(weekDates[6])} • Showing {filteredClasses.length} class schedule
                    {filteredClasses.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value)
                      setSelectedDate(newDate)
                    }}
                    className="w-[180px]"
                  />
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-full grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((dayName, dayIndex) => {
                    const dayClasses = scheduleByDay[dayIndex] || []
                    const dayDate = weekDates[dayIndex]
                    const isToday = dayDate.toDateString() === new Date().toDateString()
                    return (
                      <div key={dayIndex} className="flex flex-col">
                        <div className={`font-semibold text-sm mb-2 p-2 rounded-md text-center ${
                          isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <div>{DAYS_SHORT[dayIndex]}</div>
                          <div className="text-xs font-normal mt-1">{formatDateShort(dayDate)}</div>
                        </div>
                        <div className="space-y-2 min-h-[300px]">
                          {dayClasses.length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-4">
                              No classes
                            </div>
                          ) : (
                            dayClasses.map((schedule) => (
                              <Link
                                key={schedule.scheduleId}
                                href={`/admin/classes/${schedule.classId}`}
                                prefetch={true}
                              >
                                <Card className="hover:bg-muted/50 transition-colors cursor-pointer p-2">
                                  <CardContent className="p-0">
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm">{schedule.className}</div>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                          {formatTime(schedule.startTime)} -{' '}
                                          {formatTime(schedule.endTime)}
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          <span>{schedule.teacherName}</span>
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <BookOpen className="h-3 w-3" />
                                          <span>{schedule.subject}</span>
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Year {schedule.yearGroup}
                                      </div>
                                      {schedule.department && (
                                        <div className="text-xs text-muted-foreground">
                                          <div className="flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />
                                            <span>{schedule.department}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Daily Schedule</CardTitle>
                  <CardDescription>
                    {DAYS_OF_WEEK[selectedDay]}, {formatDate(selectedDate)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigateDay('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Select Day</label>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedDay.toString()}
                    onValueChange={(v) => {
                      const dayIndex = parseInt(v)
                      setSelectedDay(dayIndex)
                      // Adjust selectedDate to the next occurrence of this day
                      const today = new Date(selectedDate)
                      const currentDay = today.getDay()
                      const diff = dayIndex - currentDay
                      const newDate = new Date(today)
                      newDate.setDate(today.getDate() + diff)
                      setSelectedDate(newDate)
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((dayName, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {dayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value)
                      setSelectedDate(newDate)
                      setSelectedDay(newDate.getDay())
                    }}
                    className="w-[200px]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-lg font-semibold mb-4">
                  {DAYS_OF_WEEK[selectedDay]} Schedule - {formatDate(selectedDate)}
                </div>
                  {dailyClasses.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No classes scheduled for {DAYS_OF_WEEK[selectedDay]}
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {dailyClasses.map((schedule) => (
                        <Link
                          key={schedule.scheduleId}
                          href={`/admin/classes/${schedule.classId}`}
                          prefetch={true}
                        >
                          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                            <CardHeader>
                              <CardTitle className="text-base">{schedule.className}</CardTitle>
                              <CardDescription>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                  </span>
                                </div>
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Teacher:</span>
                                <span className="font-medium">{schedule.teacherName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Subject:</span>
                                <span className="font-medium">{schedule.subject}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Year Group:</span>{' '}
                                <span className="font-medium">Year {schedule.yearGroup}</span>
                              </div>
                              {schedule.department && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Department:</span>
                                  <span className="font-medium">{schedule.department}</span>
                                </div>
                              )}
                              <div className="text-sm">
                                <span className="text-muted-foreground">Students:</span>{' '}
                                <span className="font-medium">{schedule.studentCount}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

