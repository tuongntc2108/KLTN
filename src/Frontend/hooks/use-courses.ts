// hooks/use-courses.ts
import { useState, useCallback } from 'react'

interface Course {
  id: number
  issuer_id: number
  course_name: string
  course_description: string | null
  training_content: string | null
  duration: string | null
  created_at: string
  updated_at: string
  certificate_count: number
}

interface CoursesState {
  courses: Course[]
  loading: boolean
  error: string | null
}

interface CreateCourseData {
  course_name: string
  course_description?: string
  training_content?: string
  duration?: string
}

interface UpdateCourseData extends Partial<CreateCourseData> {}

export function useCourses() {
  const [state, setState] = useState<CoursesState>({
    courses: [],
    loading: false,
    error: null
  })

  const setCourses = (courses: Course[]) => {
    setState(prev => ({ ...prev, courses }))
  }

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }

  // Fetch all courses
  const fetchCourses = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/courses', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch courses')
      }

      const data = await response.json()
      setCourses(data.courses || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Create new course
  const createCourse = useCallback(async (courseData: CreateCourseData): Promise<Course | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create course')
      }

      const data = await response.json()
      const newCourse = data.course

      // Add to local state
      setState(prev => ({
        ...prev,
        courses: [newCourse, ...prev.courses]
      }))

      return newCourse
    } catch (error) {
      console.error('Error creating course:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Update existing course
  const updateCourse = useCallback(async (id: number, updateData: UpdateCourseData): Promise<Course | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update course')
      }

      const data = await response.json()
      const updatedCourse = data.course

      // Update local state
      setState(prev => ({
        ...prev,
        courses: prev.courses.map(course => 
          course.id === id ? updatedCourse : course
        )
      }))

      return updatedCourse
    } catch (error) {
      console.error('Error updating course:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Delete course
  const deleteCourse = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete course')
      }

      // Remove from local state
      setState(prev => ({
        ...prev,
        courses: prev.courses.filter(course => course.id !== id)
      }))

      return true
    } catch (error) {
      console.error('Error deleting course:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Get course by ID
  const getCourseById = useCallback(async (id: number): Promise<Course | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch course')
      }

      const data = await response.json()
      return data.course
    } catch (error) {
      console.error('Error fetching course:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Clear error function
  const clearError = useCallback(() => setError(null), [])

  return {
    courses: state.courses,
    loading: state.loading,
    error: state.error,
    fetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    getCourseById,
    clearError
  }
}