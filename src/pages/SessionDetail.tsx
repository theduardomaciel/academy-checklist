import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, PHOTOS_BUCKET } from '../lib/supabaseClient'
import ItemCard from '../components/ItemCard'
import type { ChecklistItem, ClosingSession, LogEntry } from '../types'

interface SessionDetailRow extends ClosingSession {
  checklist_templates: { name: string } | null
}

const SIGNED_URL_TTL_SECONDS = 60 * 10 // 10 minutes is plenty for viewing this page

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionDetailRow | null>(null)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [logsByItem, setLogsByItem] = useState<Record<string, LogEntry>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  async function load() {
    setLoading(true)
    setError('')

    const { data: sessionData, error: sessionError } = await supabase
      .from('closing_sessions')
      .select('id, status, started_at, completed_at, template_id, checklist_templates(name)')
      .eq('id', sessionId!)
      .single()

    if (sessionError || !sessionData) {
      setError('Fechamento não encontrado.')
      setLoading(false)
      return
    }

    const [{ data: itemData }, { data: logData }] = await Promise.all([
      supabase
        .from('checklist_items')
        .select('id, title, instructions, order_index, requires_photo')
        .eq('template_id', sessionData.template_id)
        .order('order_index'),
      supabase.from('closing_logs').select('*').eq('session_id', sessionId!)
    ])

    const map: Record<string, LogEntry> = {}
    for (const log of logData ?? []) {
      let previewUrl: string | null = null
      if (log.photo_path) {
        const { data: signed } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .createSignedUrl(log.photo_path, SIGNED_URL_TTL_SECONDS)
        previewUrl = signed?.signedUrl ?? null
      }
      map[log.item_id] = { status: log.status, photo_path: log.photo_path, previewUrl }
    }

    setSession(sessionData as unknown as SessionDetailRow)
    setItems(itemData ?? [])
    setLogsByItem(map)
    setLoading(false)
  }

  if (loading) {
    return (
      <main className="app-main">
        <div className="centered-shell">
          <span className="spinner" style={{ color: 'var(--color-primary)' }} />
        </div>
      </main>
    )
  }

  if (error || !session) {
    return (
      <main className="app-main">
        <div className="form-error">{error}</div>
      </main>
    )
  }

  return (
    <main className="app-main">
      <p className="page-title">{session.checklist_templates?.name ?? 'Checklist'}</p>
      <p className="page-subtitle">
        {new Date(session.started_at).toLocaleString('pt-BR')} ·{' '}
        {session.status === 'completed' ? 'Concluído' : 'Em andamento'}
      </p>

      {items.map((item, idx) => {
        const entry = logsByItem[item.id] ?? {}
        return (
          <ItemCard
            key={item.id}
            index={idx + 1}
            item={item}
            status={entry.status}
            photoUrl={entry.previewUrl}
            readOnly
          />
        )
      })}

      <nav className="list-nav">
        <button className="btn btn-secondary" onClick={() => navigate('/historico')}>
          Voltar ao histórico
        </button>
      </nav>
    </main>
  )
}
