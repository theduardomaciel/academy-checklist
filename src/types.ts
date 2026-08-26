export type ItemStatus = 'done' | 'skipped'

export interface AdminUser {
  id: string
  email: string | null
  full_name: string | null
  is_admin: boolean
  role: string | null
  created_at: string
}

export const USER_ROLES = ['Prefeito', 'Bolsista', 'Gerente'] as const

/** ChecklistTemplate with admin-only fields (full row from the DB). */
export interface AdminChecklistTemplate {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface ChecklistTemplate {
  id: string
  name: string
  description: string | null
}

export interface ChecklistItem {
  id: string
  title: string
  location: string | null
  instructions: string | null
  order_index: number
  requires_photo: boolean
}

export interface ClosingSession {
  id: string
  template_id: string
  status: 'in_progress' | 'completed' | 'cancelled'
  started_at: string
  completed_at: string | null
}

export interface ClosingLog {
  item_id: string
  status: ItemStatus
  photo_path: string | null
}

/** Client-side view of a closing log, including transient photo state. */
export interface LogEntry {
  status?: ItemStatus
  photo_path?: string | null
  previewUrl?: string | null
  pendingFile?: File
}
