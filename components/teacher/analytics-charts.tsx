'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface AnalyticsChartsProps {
  analytics: {
    subjectPerformance?: Array<{ name: string; average: number; count: number }>
    yearGroupPerformance?: Array<{ name: string; average: number; count: number }>
    workTypePerformance?: Array<{ name: string; average: number; count: number }>
    classPerformance?: Array<{ name: string; average: number; count: number }>
    performanceOverTime?: Array<{ date: string; percentage: number }>
    topPerformers?: Array<{ name: string; count: number; average: number }>
    studentsNeedingAttention?: Array<{ name: string; count: number; average: number }>
    topTopics?: Array<{ name: string; count: number; average: number }>
    notSubmittedCount?: number
    submittedCount?: number
    resitCount?: number
    reAssignedCount?: number
  }
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300']

export default function TeacherAnalyticsCharts({ analytics }: AnalyticsChartsProps) {
  // Work status pie chart data
  const statusData = [
    { name: 'Submitted', value: analytics.submittedCount || 0 },
    { name: 'Not Submitted', value: analytics.notSubmittedCount || 0 },
    { name: 'Resit', value: analytics.resitCount || 0 },
    { name: 'Re-assigned', value: analytics.reAssignedCount || 0 },
  ].filter((item) => item.value > 0)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Performance by Subject */}
      {analytics.subjectPerformance && analytics.subjectPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Subject</CardTitle>
            <CardDescription>Average scores across different subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#8884d8" name="Average %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance by Year Group */}
      {analytics.yearGroupPerformance && analytics.yearGroupPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Year Group</CardTitle>
            <CardDescription>Average scores by year group</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.yearGroupPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#82ca9d" name="Average %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance by Work Type */}
      {analytics.workTypePerformance && analytics.workTypePerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Work Type</CardTitle>
            <CardDescription>Average scores by homework, classwork, and past papers</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.workTypePerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#ffc658" name="Average %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Work Status Distribution */}
      {statusData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Work Status Distribution</CardTitle>
            <CardDescription>Breakdown of work submission status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Class Performance Comparison */}
      {analytics.classPerformance && analytics.classPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Class Performance Comparison</CardTitle>
            <CardDescription>Average scores across your classes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.classPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#00c49f" name="Average %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance Over Time */}
      {analytics.performanceOverTime && analytics.performanceOverTime.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Over Time (Weekly)</CardTitle>
            <CardDescription>Trends in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.performanceOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="percentage" stroke="#8884d8" name="Score %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {analytics.topPerformers && analytics.topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Students</CardTitle>
            <CardDescription>Students with highest average scores</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topPerformers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#00c49f" name="Average %" />
                <Bar dataKey="count" fill="#82ca9d" name="Work Records" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Students Needing Attention */}
      {analytics.studentsNeedingAttention && analytics.studentsNeedingAttention.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Students Needing Attention</CardTitle>
            <CardDescription>Students with average scores below 70%</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.studentsNeedingAttention}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#ff8042" name="Average %" />
                <Bar dataKey="count" fill="#ffc658" name="Work Records" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Topics Covered */}
      {analytics.topTopics && analytics.topTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Covered Topics</CardTitle>
            <CardDescription>Topics with most work records</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topTopics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#00c49f" name="Work Records" />
                <Bar dataKey="average" fill="#8884d8" name="Average %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
