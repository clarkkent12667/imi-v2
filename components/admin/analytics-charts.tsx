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
    departmentPerformance?: Array<{ name: string; average: number; count: number }>
    teacherPerformance?: Array<{ name: string; id: string; average: number; count: number }>
    topClasses?: Array<{ name: string; average: number; count: number }>
    bottomClasses?: Array<{ name: string; average: number; count: number }>
    performanceOverTime?: Array<{ date: string; percentage: number }>
    monthlyTrends?: Array<{ month: string; percentage: number }>
    mostActiveStudents?: Array<{ name: string; count: number; average: number }>
    leastActiveStudents?: Array<{ name: string; count: number; average: number }>
    topTopics?: Array<{ name: string; count: number; average: number }>
    notSubmittedCount?: number
    submittedCount?: number
    resitCount?: number
    reAssignedCount?: number
    totalRecords?: number
  }
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe', '#00c49f', '#ffbb28', '#ff8042']

export default function AnalyticsCharts({ analytics }: AnalyticsChartsProps) {
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

      {/* Performance by Department */}
      {analytics.departmentPerformance && analytics.departmentPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Department</CardTitle>
            <CardDescription>Average scores across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.departmentPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#ff7300" name="Average %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Performing Classes */}
      {analytics.topClasses && analytics.topClasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Classes</CardTitle>
            <CardDescription>Classes with highest average scores</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topClasses}>
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

      {/* Classes Needing Attention */}
      {analytics.bottomClasses && analytics.bottomClasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Classes Needing Attention</CardTitle>
            <CardDescription>Classes with lowest average scores</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.bottomClasses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#ff8042" name="Average %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Teacher Performance */}
      {analytics.teacherPerformance && analytics.teacherPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Teacher Performance</CardTitle>
            <CardDescription>Top teachers by average student scores</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.teacherPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#0088fe" name="Average %" />
                <Bar dataKey="count" fill="#00ff00" name="Work Records" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance Over Time (Weekly) */}
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

      {/* Monthly Trends */}
      {analytics.monthlyTrends && analytics.monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance Trends</CardTitle>
            <CardDescription>Average scores over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="percentage" stroke="#82ca9d" name="Average %" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Most Active Students */}
      {analytics.mostActiveStudents && analytics.mostActiveStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Active Students</CardTitle>
            <CardDescription>Students with most work records</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.mostActiveStudents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#ffbb28" name="Work Records" />
                <Bar dataKey="average" fill="#8884d8" name="Average %" />
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
