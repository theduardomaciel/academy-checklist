export type ItemStatus = 'done' | 'skipped'

export interface ChecklistTemplate {
  id: string
  name: string
  description: string | null
}

export interface ChecklistItem {
  id: string
  title: string
  instructions: string | null
  order_index: number
  requires_photo: boolean
}

export interface ClosingSession {
  id: string
  template_id: string
  status: 'in_progress' | 'completed'
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
