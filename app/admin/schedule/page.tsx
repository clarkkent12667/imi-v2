'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDownIcon,
  Plus,
  Settings,
  Users,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  X,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'

interface Teacher {
  id: string
  full_name: string
  email: string
}

interface Department {
  id: string
  name: string
}

interface Class {
  id: string
  name: string
  teacher_id: string
  class_students?: Array<{
    students: {
      full_name: string
    }
  }>
}

interface Schedule {
  id: string
  class_id: string
  day_of_week: number
  start_time: string
  end_time: string
  classes: Class
}

interface ClassOption {
  id: string
  name: string
  teacher_id: string
}

const DAYS = [
  { value: 0, label: 'Monday', short: 'Mon', color: 'bg-blue-500' },
  { value: 1, label: 'Tuesday', short: 'Tue', color: 'bg-green-500' },
  { value: 2, label: 'Wednesday', short: 'Wed', color: 'bg-purple-500' },
  { value: 3, label: 'Thursday', short: 'Thu', color: 'bg-orange-500' },
  { value: 4, label: 'Friday', short: 'Fri', color: 'bg-pink-500' },
  { value: 5, label: 'Saturday', short: 'Sat', color: 'bg-indigo-500' },
  { value: 6, label: 'Sunday', short: 'Sun', color: 'bg-red-500' },
]

// Generate time slots from 8am to 8pm (30-minute intervals)
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 8; hour <= 20; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
    if (hour < 20) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()
const SLOT_HEIGHT = 48 // Increased height for better visibility

// Color palette for schedule blocks
const SCHEDULE_COLORS = [
  'bg-blue-100 border-blue-300 hover:bg-blue-200 text-blue-900',
  'bg-green-100 border-green-300 hover:bg-green-200 text-green-900',
  'bg-purple-100 border-purple-300 hover:bg-purple-200 text-purple-900',
  'bg-orange-100 border-orange-300 hover:bg-orange-200 text-orange-900',
  'bg-pink-100 border-pink-300 hover:bg-pink-200 text-pink-900',
  'bg-indigo-100 border-indigo-300 hover:bg-indigo-200 text-indigo-900',
  'bg-teal-100 border-teal-300 hover:bg-teal-200 text-teal-900',
]

const getScheduleColor = (index: number) => {
  return SCHEDULE_COLORS[index % SCHEDULE_COLORS.length]
}

export default function SchedulePage() {
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set())
  const [departmentTeachers, setDepartmentTeachers] = useState<Teacher[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [draggedSchedule, setDraggedSchedule] = useState<Schedule | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<{ teacherId: string; day: number; timeSlot: string } | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [creatingSchedule, setCreatingSchedule] = useState<{ teacherId: string; day: number; timeSlot: string } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)

  // Form state for create/edit
  const [formData, setFormData] = useState({
    classId: '',
    dayOfWeek: 0,
    startTime: '',
    endTime: '',
    teacherId: '',
  })

  // Get day of week from selected date
  const selectedDayOfWeek = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1
  
  // Get week start (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }
  
  const weekStart = getWeekStart(selectedDate)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentTeachers(selectedDepartment)
    } else {
      // "All Staff" selected - show all teachers
      // Only update if allTeachers actually changed (check by length and IDs)
      if (allTeachers.length > 0) {
        const currentIds = new Set(departmentTeachers.map(t => t.id))
        const newIds = new Set(allTeachers.map(t => t.id))
        const idsChanged = currentIds.size !== newIds.size || 
          !Array.from(newIds).every(id => currentIds.has(id))
        
        if (idsChanged) {
          setDepartmentTeachers(allTeachers)
        }
        
        if (selectedTeachers.size === 0 && allTeachers.length > 0) {
          setSelectedTeachers(newIds)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, allTeachers.length]) // Use length to avoid infinite loops

  useEffect(() => {
    if (departmentTeachers.length > 0 && selectedTeachers.size === 0) {
      // Auto-select all teachers when department changes
      const teacherIds = new Set(departmentTeachers.map(t => t.id))
      setSelectedTeachers(teacherIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentTeachers.length]) // Use length to avoid infinite loops

  const fetchData = async () => {
    try {
      const [teachersRes, departmentsRes, schedulesRes, classesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/departments'),
        fetch('/api/schedules'),
        fetch('/api/classes'),
      ])

      if (!teachersRes.ok || !departmentsRes.ok || !schedulesRes.ok || !classesRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [teachersData, departmentsData, schedulesData, classesData] = await Promise.all([
        teachersRes.json(),
        departmentsRes.json(),
        schedulesRes.json(),
        classesRes.json(),
      ])

      setAllTeachers(teachersData)
      setDepartments(departmentsData)
      setSchedules(schedulesData)
      setClasses(classesData)
      setDepartmentTeachers(teachersData)
      setSelectedTeachers(new Set(teachersData.map((t: Teacher) => t.id)))
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDepartmentTeachers = async (departmentId: string) => {
    try {
      const response = await fetch(`/api/departments/${departmentId}/teachers`)
      if (!response.ok) throw new Error('Failed to fetch department teachers')
      const data = await response.json()
      setDepartmentTeachers(data)
      setSelectedTeachers(new Set(data.map((t: Teacher) => t.id)))
    } catch (error: any) {
      toast.error(error.message)
      setDepartmentTeachers([])
    }
  }

  const toggleTeacher = (teacherId: string) => {
    setSelectedTeachers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(teacherId)) {
        newSet.delete(teacherId)
      } else {
        newSet.add(teacherId)
      }
      return newSet
    })
  }

  const toggleAllTeachers = () => {
    if (selectedTeachers.size === departmentTeachers.length) {
      setSelectedTeachers(new Set())
    } else {
      setSelectedTeachers(new Set(departmentTeachers.map(t => t.id)))
    }
  }

  const getScheduleForSlot = (teacherId: string, day: number, timeSlot: string) => {
    return schedules.find(
      (s) =>
        s.classes.teacher_id === teacherId &&
        s.day_of_week === day &&
        s.start_time <= timeSlot &&
        s.end_time > timeSlot
    )
  }

  const getScheduleHeight = (schedule: Schedule) => {
    const start = TIME_SLOTS.indexOf(schedule.start_time)
    const end = TIME_SLOTS.indexOf(schedule.end_time)
    if (start === -1 || end === -1) return SLOT_HEIGHT
    return Math.max((end - start) * SLOT_HEIGHT, SLOT_HEIGHT)
  }

  const getScheduleTop = (schedule: Schedule) => {
    const start = TIME_SLOTS.indexOf(schedule.start_time)
    if (start === -1) return 0
    return start * SLOT_HEIGHT
  }

  const handleDragStart = (e: React.DragEvent, schedule: Schedule) => {
    setDraggedSchedule(schedule)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', schedule.id)
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
    setDraggedSchedule(null)
    setDragOverTarget(null)
  }

  const handleDragOver = (e: React.DragEvent, teacherId: string, day: number, timeSlot: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverTarget({ teacherId, day, timeSlot })
  }

  const handleDragLeave = () => {
    setDragOverTarget(null)
  }

  const handleDrop = async (
    e: React.DragEvent,
    targetTeacherId: string,
    targetDay: number,
    targetTimeSlot: string
  ) => {
    e.preventDefault()
    setDragOverTarget(null)
    
    if (!draggedSchedule) return

    const slotIndex = TIME_SLOTS.indexOf(targetTimeSlot)
    if (slotIndex === -1) return

    const newStartTime = targetTimeSlot
    const endSlotIndex = Math.min(slotIndex + 2, TIME_SLOTS.length - 1)
    const newEndTime = TIME_SLOTS[endSlotIndex]

    try {
      const response = await fetch(`/api/schedules/${draggedSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: draggedSchedule.class_id,
          dayOfWeek: targetDay,
          startTime: newStartTime,
          endTime: newEndTime,
          teacherId: targetTeacherId !== draggedSchedule.classes.teacher_id ? targetTeacherId : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update schedule')
      }

      toast.success('Schedule updated successfully')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setDraggedSchedule(null)
    }
  }

  const handleSlotClick = (teacherId: string, day: number, timeSlot: string) => {
    const existingSchedule = getScheduleForSlot(teacherId, day, timeSlot)
    if (existingSchedule) {
      // Edit existing schedule
      setEditingSchedule(existingSchedule)
      setFormData({
        classId: existingSchedule.class_id,
        dayOfWeek: existingSchedule.day_of_week,
        startTime: existingSchedule.start_time,
        endTime: existingSchedule.end_time,
        teacherId: existingSchedule.classes.teacher_id,
      })
    } else {
      // Create new schedule
      setCreatingSchedule({ teacherId, day, timeSlot })
      const slotIndex = TIME_SLOTS.indexOf(timeSlot)
      const endSlotIndex = Math.min(slotIndex + 2, TIME_SLOTS.length - 1)
      setFormData({
        classId: '',
        dayOfWeek: day,
        startTime: timeSlot,
        endTime: TIME_SLOTS[endSlotIndex],
        teacherId: teacherId,
      })
    }
  }

  const handleSaveSchedule = async () => {
    try {
      if (!formData.classId || !formData.startTime || !formData.endTime) {
        toast.error('Please fill in all required fields')
        return
      }

      if (editingSchedule) {
        // Update existing schedule
        const response = await fetch(`/api/schedules/${editingSchedule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: formData.classId,
            dayOfWeek: formData.dayOfWeek,
            startTime: formData.startTime,
            endTime: formData.endTime,
            teacherId: formData.teacherId !== editingSchedule.classes.teacher_id ? formData.teacherId : undefined,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update schedule')
        }

        toast.success('Schedule updated successfully')
      } else {
        // Create new schedule
        const response = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: formData.classId,
            schedules: [{
              dayOfWeek: formData.dayOfWeek,
              startTime: formData.startTime,
              endTime: formData.endTime,
            }],
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create schedule')
        }

        toast.success('Schedule created successfully')
      }

      setEditingSchedule(null)
      setCreatingSchedule(null)
      setFormData({
        classId: '',
        dayOfWeek: 0,
        startTime: '',
        endTime: '',
        teacherId: '',
      })
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDeleteSchedule = async () => {
    if (!showDeleteDialog) return

    try {
      const response = await fetch(`/api/schedules/${showDeleteDialog}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete schedule')
      }

      toast.success('Schedule deleted successfully')
      setShowDeleteDialog(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setSelectedDate(prev => addDays(prev, direction === 'next' ? 1 : -1))
    } else {
      // Week view - navigate by week
      setSelectedDate(prev => addDays(prev, direction === 'next' ? 7 : -7))
    }
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  // Filter teachers based on selection and search
  const displayedTeachers = departmentTeachers.filter(t => 
    selectedTeachers.has(t.id) &&
    (searchQuery === '' || 
     t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     t.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Get classes for selected teacher
  const getClassesForTeacher = (teacherId: string) => {
    return classes.filter(c => c.teacher_id === teacherId)
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <div className="text-muted-foreground">Loading schedule...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Management</h1>
          <p className="text-muted-foreground mt-1">View and manage class schedules</p>
        </div>
        <Link href="/admin/classes">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Class
          </Button>
        </Link>
      </div>

      {/* Controls Bar */}
      <Card className="py-2">
        <CardContent className="p-2 px-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Department/Teacher Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-between hover:bg-accent">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {selectedDepartment 
                      ? `${departments.find(d => d.id === selectedDepartment)?.name || 'Department'} (${selectedTeachers.size})`
                      : `All Staff (${selectedTeachers.size})`
                    }
                  </div>
                  <ChevronDownIcon className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Department/Teachers</Label>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search teachers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {/* Departments */}
                    {departments.map((dept) => (
                      <div key={dept.id} className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`dept-${dept.id}`}
                            checked={selectedDepartment === dept.id}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedDepartment(dept.id)
                                setSearchQuery('')
                              } else {
                                setSelectedDepartment(null)
                              }
                            }}
                          />
                          <label htmlFor={`dept-${dept.id}`} className="text-sm font-medium cursor-pointer">
                            {dept.name}
                          </label>
                        </div>
                        {selectedDepartment === dept.id && (
                          <div className="ml-6 space-y-0.5">
                            <div className="flex items-center space-x-2 mb-1">
                              <Checkbox
                                id={`select-all-${dept.id}`}
                                checked={selectedTeachers.size === departmentTeachers.length && departmentTeachers.length > 0}
                                onCheckedChange={toggleAllTeachers}
                              />
                              <label htmlFor={`select-all-${dept.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                Select All
                              </label>
                            </div>
                            {departmentTeachers.map((teacher) => (
                              <div key={teacher.id} className="flex items-center space-x-2 py-0.5">
                                <Checkbox
                                  id={`teacher-${teacher.id}`}
                                  checked={selectedTeachers.has(teacher.id)}
                                  onCheckedChange={() => toggleTeacher(teacher.id)}
                                />
                                <label htmlFor={`teacher-${teacher.id}`} className="text-sm cursor-pointer">
                                  {teacher.full_name}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* All Staff */}
                    <div className="border-t pt-1.5 space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="all-staff"
                          checked={selectedDepartment === null}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDepartment(null)
                              setDepartmentTeachers(allTeachers)
                              setSelectedTeachers(new Set(allTeachers.map(t => t.id)))
                              setSearchQuery('')
                            }
                          }}
                        />
                        <label htmlFor="all-staff" className="text-sm font-medium cursor-pointer">
                          All Staff
                        </label>
                      </div>
                      {selectedDepartment === null && (
                        <div className="ml-6 space-y-0.5">
                          <div className="flex items-center space-x-2 mb-1">
                            <Checkbox
                              id="select-all-staff"
                              checked={selectedTeachers.size === allTeachers.length && allTeachers.length > 0}
                              onCheckedChange={() => {
                                if (selectedTeachers.size === allTeachers.length) {
                                  setSelectedTeachers(new Set())
                                } else {
                                  setSelectedTeachers(new Set(allTeachers.map(t => t.id)))
                                }
                              }}
                            />
                            <label htmlFor="select-all-staff" className="text-xs text-muted-foreground cursor-pointer">
                              Select All
                            </label>
                          </div>
                          {allTeachers
                            .filter(t => 
                              searchQuery === '' ||
                              t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              t.email.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((teacher) => (
                            <div key={teacher.id} className="flex items-center space-x-2 py-0.5">
                              <Checkbox
                                id={`teacher-all-${teacher.id}`}
                                checked={selectedTeachers.has(teacher.id)}
                                onCheckedChange={() => toggleTeacher(teacher.id)}
                              />
                              <label htmlFor={`teacher-all-${teacher.id}`} className="text-sm cursor-pointer">
                                {teacher.full_name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Date Navigation */}
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToToday} className="min-w-[75px]">
                Today
              </Button>
              <div className="min-w-[240px] text-center font-medium px-3">
                {viewMode === 'day' ? (
                  <div className="flex items-center justify-center gap-2">
                    <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                    {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        Today
                      </span>
                    )}
                  </div>
                ) : (
                  `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
                )}
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* View Mode Toggle */}
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {viewMode === 'day' ? 'Day View' : 'Week View'}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Day View
                  </div>
                </SelectItem>
                <SelectItem value="week">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Week View
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <Card className="py-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className={viewMode === 'week' ? 'min-w-[1400px]' : 'min-w-[1000px]'}>
              {/* Header */}
              <div className="flex border-b sticky top-0 bg-background z-20 shadow-sm">
                <div className="w-28 border-r p-2 font-semibold bg-muted/50 flex items-center justify-end">
                  <Clock className="h-4 w-4 mr-1.5" />
                  <span className="text-sm">Time</span>
                </div>
                {viewMode === 'week' ? (
                  DAYS.map((day) => {
                    const dayDate = addDays(weekStart, day.value)
                    const isToday = format(dayDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                    return (
                      <div
                        key={day.value}
                        className={`flex-1 border-r p-2 text-center font-semibold min-w-[200px] ${
                          isToday ? 'bg-primary/10 border-primary/20' : 'bg-muted/50'
                        }`}
                      >
                        <div className={`text-sm ${isToday ? 'text-primary font-bold' : ''}`}>
                          {day.label}
                        </div>
                        <div className={`text-xs mt-0.5 ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                          {format(dayDate, 'MMM d')}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  displayedTeachers.map((teacher) => (
                    <div key={teacher.id} className="flex-1 border-r p-2 text-center font-semibold bg-muted/50 min-w-[200px]">
                      <div className="font-semibold text-sm truncate">{teacher.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{teacher.email}</div>
                    </div>
                  ))
                )}
                {displayedTeachers.length === 0 && (
                  <div className="flex-1 p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No teachers selected</p>
                    <p className="text-sm mt-1">Select teachers from the filter above</p>
                  </div>
                )}
              </div>

              {/* Schedule grid */}
              <div className="flex relative">
                {/* Time column */}
                <div className="w-28 border-r bg-muted/20 sticky left-0 z-10">
                  {TIME_SLOTS.map((time, index) => (
                    <div
                      key={time}
                      className="h-[48px] border-b flex items-center justify-end pr-2 text-xs text-muted-foreground relative"
                      style={{ minHeight: `${SLOT_HEIGHT}px` }}
                    >
                      {index % 2 === 0 ? (
                        <span className="font-medium">{time}</span>
                      ) : (
                        <span className="text-[10px] opacity-40">{time.split(':')[1]}</span>
                      )}
                    </div>
                  ))}
                </div>

                {viewMode === 'week' ? (
                  // Week view: Days as columns
                  DAYS.map((day) => (
                    <div key={day.value} className="flex-1 border-r relative min-w-[200px]">
                      {TIME_SLOTS.map((timeSlot) => {
                        const schedulesForSlot = schedules.filter(
                          (s) =>
                            displayedTeachers.some(t => t.id === s.classes.teacher_id) &&
                            s.day_of_week === day.value &&
                            s.start_time <= timeSlot &&
                            s.end_time > timeSlot
                        )
                        
                        return (
                          <div
                            key={`${day.value}-${timeSlot}`}
                            className="h-[48px] border-b hover:bg-muted/30 transition-colors cursor-pointer relative group border-dashed border-l-0 border-r-0 border-t-0 border-muted/40"
                            style={{ minHeight: `${SLOT_HEIGHT}px` }}
                            onClick={() => {
                              const firstTeacher = displayedTeachers[0]
                              if (firstTeacher) {
                                handleSlotClick(firstTeacher.id, day.value, timeSlot)
                              }
                            }}
                          >
                            {schedulesForSlot
                              .filter(s => s.start_time === timeSlot)
                              .map((schedule, idx) => {
                                const teacher = displayedTeachers.find(t => t.id === schedule.classes.teacher_id)
                                const colorClass = getScheduleColor(idx)
                                return (
                                  <div
                                    key={schedule.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, schedule)}
                                    onDragEnd={handleDragEnd}
                                    className={`absolute left-1 right-1 ${colorClass} border rounded-md px-2 py-1.5 text-xs cursor-move hover:shadow-md transition-all z-10 group/item`}
                                    style={{
                                      top: `${getScheduleTop(schedule)}px`,
                                      height: `${getScheduleHeight(schedule)}px`,
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingSchedule(schedule)
                                      setFormData({
                                        classId: schedule.class_id,
                                        dayOfWeek: schedule.day_of_week,
                                        startTime: schedule.start_time,
                                        endTime: schedule.end_time,
                                        teacherId: schedule.classes.teacher_id,
                                      })
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold truncate">{schedule.classes.name}</div>
                                        <div className="text-[10px] opacity-75 mt-0.5">
                                          {schedule.start_time} - {schedule.end_time}
                                        </div>
                                        {teacher && (
                                          <div className="text-[9px] opacity-60 truncate mt-0.5">
                                            {teacher.full_name}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingSchedule(schedule)
                                            setFormData({
                                              classId: schedule.class_id,
                                              dayOfWeek: schedule.day_of_week,
                                              startTime: schedule.start_time,
                                              endTime: schedule.end_time,
                                              teacherId: schedule.classes.teacher_id,
                                            })
                                          }}
                                          className="p-0.5 hover:bg-black/10 rounded"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setShowDeleteDialog(schedule.id)
                                          }}
                                          className="p-0.5 hover:bg-red-500/20 rounded text-red-600"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        )
                      })}
                    </div>
                  ))
                ) : (
                  // Day view: Teachers as columns
                  displayedTeachers.map((teacher) => (
                    <div key={teacher.id} className="flex-1 border-r relative min-w-[200px]">
                      {TIME_SLOTS.map((timeSlot) => {
                        const schedule = getScheduleForSlot(teacher.id, selectedDayOfWeek, timeSlot)
                        const isDragOver = dragOverTarget?.teacherId === teacher.id && 
                                          dragOverTarget?.day === selectedDayOfWeek && 
                                          dragOverTarget?.timeSlot === timeSlot
                        
                        return (
                          <div
                            key={`${teacher.id}-${timeSlot}`}
                            className={`h-[48px] border-b transition-colors cursor-pointer relative group ${
                              isDragOver 
                                ? 'bg-primary/20 border-primary/50' 
                                : draggedSchedule 
                                  ? 'hover:bg-muted/50' 
                                  : schedule
                                    ? ''
                                    : 'hover:bg-muted/30 border-dashed border-l-0 border-r-0 border-t-0 border-muted/40'
                            }`}
                            style={{ minHeight: `${SLOT_HEIGHT}px` }}
                            onDragOver={(e) => handleDragOver(e, teacher.id, selectedDayOfWeek, timeSlot)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, teacher.id, selectedDayOfWeek, timeSlot)}
                            onClick={() => handleSlotClick(teacher.id, selectedDayOfWeek, timeSlot)}
                          >
                            {schedule && schedule.start_time === timeSlot && (
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, schedule)}
                                onDragEnd={handleDragEnd}
                                className={`absolute left-1 right-1 ${getScheduleColor(0)} border rounded-md px-2 py-1.5 text-xs cursor-move hover:shadow-lg transition-all z-10 group/item`}
                                style={{
                                  top: `${getScheduleTop(schedule)}px`,
                                  height: `${getScheduleHeight(schedule)}px`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingSchedule(schedule)
                                  setFormData({
                                    classId: schedule.class_id,
                                    dayOfWeek: schedule.day_of_week,
                                    startTime: schedule.start_time,
                                    endTime: schedule.end_time,
                                    teacherId: schedule.classes.teacher_id,
                                  })
                                }}
                              >
                                <div className="flex items-start justify-between gap-2 h-full">
                                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                      <div className="font-semibold truncate">{schedule.classes.name}</div>
                                      <div className="text-[10px] opacity-75 mt-0.5">
                                        {schedule.start_time} - {schedule.end_time}
                                      </div>
                                    </div>
                                    {schedule.classes.class_students && schedule.classes.class_students.length > 0 && (
                                      <div className="text-[9px] opacity-60 truncate mt-1">
                                        {schedule.classes.class_students.length} student{schedule.classes.class_students.length !== 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingSchedule(schedule)
                                        setFormData({
                                          classId: schedule.class_id,
                                          dayOfWeek: schedule.day_of_week,
                                          startTime: schedule.start_time,
                                          endTime: schedule.end_time,
                                          teacherId: schedule.classes.teacher_id,
                                        })
                                      }}
                                      className="p-1 hover:bg-black/10 rounded"
                                      title="Edit schedule"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setShowDeleteDialog(schedule.id)
                                      }}
                                      className="p-1 hover:bg-red-500/20 rounded text-red-600"
                                      title="Delete schedule"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {!schedule && !draggedSchedule && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border border-dashed">
                                  Click to add
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Schedule Dialog */}
      <Dialog open={!!(editingSchedule || creatingSchedule)} onOpenChange={(open) => {
        if (!open) {
          setEditingSchedule(null)
          setCreatingSchedule(null)
          setFormData({
            classId: '',
            dayOfWeek: 0,
            startTime: '',
            endTime: '',
            teacherId: '',
          })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
            </DialogTitle>
            <DialogDescription>
              {editingSchedule 
                ? 'Update the schedule details below'
                : 'Select a class and set the schedule time'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teacher">Teacher</Label>
              <Select
                value={formData.teacherId}
                onValueChange={(value) => setFormData({ ...formData, teacherId: value, classId: '' })}
                disabled={!!editingSchedule}
              >
                <SelectTrigger id="teacher">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {displayedTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Select
                value={formData.classId}
                onValueChange={(value) => setFormData({ ...formData, classId: value })}
                disabled={!formData.teacherId}
              >
                <SelectTrigger id="class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {formData.teacherId ? (
                    getClassesForTeacher(formData.teacherId).length > 0 ? (
                      getClassesForTeacher(formData.teacherId).map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-classes" disabled>
                        No classes available for this teacher
                      </SelectItem>
                    )
                  ) : (
                    <SelectItem value="select-teacher" disabled>
                      Select a teacher first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="day">Day</Label>
              <Select
                value={formData.dayOfWeek.toString()}
                onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
              >
                <SelectTrigger id="day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingSchedule(null)
                setCreatingSchedule(null)
                setFormData({
                  classId: '',
                  dayOfWeek: 0,
                  startTime: '',
                  endTime: '',
                  teacherId: '',
                })
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule}>
              {editingSchedule ? 'Update' : 'Create'} Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this schedule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSchedule}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
