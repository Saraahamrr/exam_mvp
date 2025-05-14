export interface Student {
  id: number
  user: {
    username: string
    email: string
    role: string
    phone?: string
    address?: string
    enrollment_date?: string
    status?: string
    notes?: string
    profile_image?: string
  }
  track: {
    id: number
    name: string
  }
  branch: {
    id: number
    name: string
  }
  track_name?: string
  university?: string | null
  graduation_year?: string | null
  college?: string | null
  leetcode_profile?: string | null
  github_profile?: string | null
}

export interface ApiError extends Error {
  status?: number
}
