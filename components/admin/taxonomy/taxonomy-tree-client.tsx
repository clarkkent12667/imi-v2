'use client'

import { useState, useEffect } from 'react'
import { TaxonomyTree } from './taxonomy-tree'

interface TaxonomyNode {
  id: string
  name: string
  children?: TaxonomyNode[]
}

export function TaxonomyTreeClient({ initialData }: { initialData: TaxonomyNode[] }) {
  const [data, setData] = useState(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/taxonomy/qualifications')
      const qualifications = await response.json()

      // Fetch all related data
      const [examBoardsRes, subjectsRes, topicsRes, subtopicsRes] = await Promise.all([
        fetch('/api/taxonomy/exam-boards'),
        fetch('/api/taxonomy/subjects'),
        fetch('/api/taxonomy/topics'),
        fetch('/api/taxonomy/subtopics'),
      ])

      const examBoards = await examBoardsRes.json()
      const subjects = await subjectsRes.json()
      const topics = await topicsRes.json()
      const subtopics = await subtopicsRes.json()

      // Build hierarchy
      const hierarchy = qualifications.map((qual: any) => {
        const qualExamBoards = examBoards.filter((eb: any) => eb.qualification_id === qual.id)
        const examBoardsWithSubjects = qualExamBoards.map((eb: any) => {
          const ebSubjects = subjects.filter((s: any) => s.exam_board_id === eb.id)
          const subjectsWithTopics = ebSubjects.map((s: any) => {
            const sTopics = topics.filter((t: any) => t.subject_id === s.id)
            const topicsWithSubtopics = sTopics.map((t: any) => {
              const tSubtopics = subtopics.filter((st: any) => st.topic_id === t.id)
              return {
                id: t.id,
                name: t.name,
                children: tSubtopics.map((st: any) => ({
                  id: st.id,
                  name: st.name,
                })),
              }
            })
            return {
              id: s.id,
              name: s.name,
              children: topicsWithSubtopics,
            }
          })
          return {
            id: eb.id,
            name: eb.name,
            children: subjectsWithTopics,
          }
        })
        return {
          id: qual.id,
          name: qual.name,
          children: examBoardsWithSubjects,
        }
      })

      setData(hierarchy)
    } catch (error) {
      console.error('Failed to refresh taxonomy:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return <TaxonomyTree type="qualification" data={data} onRefresh={refresh} />
}

