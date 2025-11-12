'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

interface WorkRecord {
  id: string
  work_title: string
  work_type: string
  assigned_date: string
  due_date: string
  marks_obtained: number
  total_marks: number
  percentage: number
  classes: { name: string }
  students: { full_name: string; school_year_group: string }
  subjects: { name: string }
  topics: { name: string } | null
  subtopics: { name: string } | null
}

export default function ReportsPage() {
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<WorkRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    workType: '',
  })

  useEffect(() => {
    fetchWorkRecords()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [filters, workRecords])

  const fetchWorkRecords = async () => {
    try {
      const response = await fetch('/api/work-records')
      if (!response.ok) throw new Error('Failed to fetch work records')
      const data = await response.json()
      setWorkRecords(data)
      setFilteredRecords(data)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...workRecords]

    if (filters.startDate) {
      filtered = filtered.filter(
        (r) => new Date(r.assigned_date) >= new Date(filters.startDate)
      )
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (r) => new Date(r.assigned_date) <= new Date(filters.endDate)
      )
    }

    if (filters.workType) {
      filtered = filtered.filter((r) => r.work_type === filters.workType)
    }

    setFilteredRecords(filtered)
  }

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Class',
      'Student',
      'Work Title',
      'Type',
      'Subject',
      'Topic',
      'Subtopic',
      'Marks',
      'Percentage',
    ]

    const rows = filteredRecords.map((record) => [
      new Date(record.assigned_date).toLocaleDateString(),
      record.classes?.name || '',
      record.students?.full_name || '',
      record.work_title,
      record.work_type,
      record.subjects?.name || '',
      record.topics?.name || '',
      record.subtopics?.name || '',
      `${record.marks_obtained} / ${record.total_marks}`,
      `${record.percentage.toFixed(1)}%`,
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `work-records-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success('Report exported successfully')
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View and export work record history</p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter work records by date and type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workType">Work Type</Label>
              <Select
                value={filters.workType}
                onValueChange={(value) => setFilters({ ...filters, workType: value })}
              >
                <SelectTrigger id="workType">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="homework">Homework</SelectItem>
                  <SelectItem value="classwork">Classwork</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({ startDate: '', endDate: '', workType: '' })}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Records History</CardTitle>
          <CardDescription>
            Showing {filteredRecords.length} of {workRecords.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No records found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Work Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.assigned_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{record.classes?.name || 'N/A'}</TableCell>
                      <TableCell className="font-medium">
                        {record.students?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>{record.work_title}</TableCell>
                      <TableCell>
                        <Badge variant={record.work_type === 'homework' ? 'default' : 'secondary'}>
                          {record.work_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.subjects?.name || 'N/A'}
                        {record.topics?.name && ` - ${record.topics.name}`}
                        {record.subtopics?.name && ` > ${record.subtopics.name}`}
                      </TableCell>
                      <TableCell>
                        {record.marks_obtained} / {record.total_marks}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.percentage >= 70
                              ? 'default'
                              : record.percentage >= 50
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {record.percentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

