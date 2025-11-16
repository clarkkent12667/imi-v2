'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

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

function formatTime(time: string): string {
  // time is in HH:MM:SS format
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function getTimeSlotKey(startTime: string, endTime: string): number {
  // Convert time to minutes since midnight for sorting
  const [hours, minutes] = startTime.split(':')
  return parseInt(hours, 10) * 60 + parseInt(minutes, 10)
}

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay())
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      // Fetch teacher's classes with schedules
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          subject_id,
          year_group_id,
          subjects(id, name),
          year_groups(id, name),
          class_students(count),
          class_schedules(
            id,
            day_of_week,
            start_time,
            end_time
          )
        `)
        .eq('teacher_id', authUser.id)
        .order('name')

      if (error) {
        console.error('Error fetching classes:', error)
        return
      }

      setClasses(data || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  // Organize classes by day and time
  const scheduleByDay: Record<number, Array<{
    classId: string
    className: string
    subject: string
    yearGroup: string
    startTime: string
    endTime: string
    studentCount: number
    scheduleId: string
  }>> = {}

  // Initialize all days
  for (let i = 0; i < 7; i++) {
    scheduleByDay[i] = []
  }

  // Populate schedule
  classes.forEach((classItem: any) => {
    if (classItem.class_schedules && classItem.class_schedules.length > 0) {
      classItem.class_schedules.forEach((schedule: any) => {
        const day = schedule.day_of_week
        if (!scheduleByDay[day]) {
          scheduleByDay[day] = []
        }
        scheduleByDay[day].push({
          classId: classItem.id,
          className: classItem.name,
          subject: classItem.subjects?.name || 'N/A',
          yearGroup: classItem.year_groups?.name || 'N/A',
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          studentCount: classItem.class_students?.[0]?.count || 0,
          scheduleId: schedule.id,
        })
      })
    }
  })

  // Sort each day's classes by start time
  Object.keys(scheduleByDay).forEach((day) => {
    scheduleByDay[parseInt(day)].sort((a, b) =>
      getTimeSlotKey(a.startTime, a.endTime) - getTimeSlotKey(b.startTime, b.endTime)
    )
  })

  const hasAnySchedules = Object.values(scheduleByDay).some((day) => day.length > 0)

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

  // For daily view, get classes for selected day
  const dailyClasses = scheduleByDay[selectedDay] || []

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading schedule...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Classes</h1>
        <p className="text-muted-foreground">View and manage your class schedule</p>
      </div>

      {!classes || classes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No classes assigned yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
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
              {hasAnySchedules ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Weekly Schedule
                        </CardTitle>
                        <CardDescription>
                          {formatDate(weekStartDate)} - {formatDate(weekDates[6])}
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
                              <div className="space-y-2 min-h-[200px]">
                                {dayClasses.length === 0 ? (
                                  <div className="text-xs text-muted-foreground text-center py-4">
                                    No classes
                                  </div>
                                ) : (
                                  dayClasses.map((classSchedule) => (
                                    <Link
                                      key={classSchedule.scheduleId}
                                      href={`/teacher/classes/${classSchedule.classId}`}
                                      prefetch={true}
                                    >
                                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer p-2">
                                        <CardContent className="p-0">
                                          <div className="space-y-1">
                                            <div className="font-medium text-sm">
                                              {classSchedule.className}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                              <Clock className="h-3 w-3" />
                                              <span>
                                                {formatTime(classSchedule.startTime)} -{' '}
                                                {formatTime(classSchedule.endTime)}
                                              </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {classSchedule.subject}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              Year {classSchedule.yearGroup}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                              <Users className="h-3 w-3" />
                                              <span>{classSchedule.studentCount} students</span>
                                            </div>
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
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No class schedules found. Classes need to have schedules assigned to appear in the weekly view.
                  </CardContent>
                </Card>
              )}
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
                      <Input
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value)
                          setSelectedDate(newDate)
                          setSelectedDay(newDate.getDay())
                        }}
                        className="w-[180px]"
                      />
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
                    <Select
                      value={selectedDay.toString()}
                      onValueChange={(v) => {
                        const dayIndex = parseInt(v)
                        setSelectedDay(dayIndex)
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
                            href={`/teacher/classes/${schedule.classId}`}
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
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Subject:</span>{' '}
                                  <span className="font-medium">{schedule.subject}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Year Group:</span>{' '}
                                  <span className="font-medium">Year {schedule.yearGroup}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Students:</span>
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

          {/* All Classes List */}
          <Card>
            <CardHeader>
              <CardTitle>All Classes</CardTitle>
              <CardDescription>Complete list of your assigned classes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classes.map((classItem: any) => (
                  <Card key={classItem.id}>
                    <CardHeader>
                      <CardTitle>{classItem.name}</CardTitle>
                      <CardDescription>
                        {classItem.subjects?.name || 'N/A'} • Year {classItem.year_groups?.name || 'N/A'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{classItem.class_students?.[0]?.count || 0} students</span>
                      </div>
                      {classItem.class_schedules && classItem.class_schedules.length > 0 ? (
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {classItem.class_schedules.length} schedule
                              {classItem.class_schedules.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {classItem.class_schedules.map((schedule: any) => (
                              <div key={schedule.id} className="text-xs">
                                {DAYS_SHORT[schedule.day_of_week]}: {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          No schedule assigned
                        </div>
                      )}
                      <div className="pt-4">
                        <Link href={`/teacher/classes/${classItem.id}`} prefetch={true}>
                          <Button className="w-full">View Class</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

