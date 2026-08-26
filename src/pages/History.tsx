import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

interface HistoryRow {
  id: string
  status: 'in_progress' | 'completed'
  started_at: string
  completed_at: string | null
  checklist_templates: { name: string } | null
  profiles: { full_name: string | null } | null
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  completed: { text: 'Concluído', className: 'badge-success' },
  in_progress: { text: 'Em andamento', className: 'badge-warning' }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function History() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  if (!user) {
    throw new Error('History requires an authenticated user')
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
    const query = supabase
      .from('closing_sessions')
      .select('id, status, started_at, completed_at, checklist_templates(name), profiles(full_name)')
      .order('started_at', { ascending: false })
      .limit(50)

    if (!isAdmin) {
      query.eq('user_id', user!.id)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError('Não foi possível carregar o histórico.')
    } else {
      setSessions((data ?? []) as unknown as HistoryRow[])
    }
    setLoading(false)
  }

  return (
    <main className="app-main">
      <p className="page-title">Histórico</p>
      <p className="page-subtitle">
        {isAdmin ? 'Fechamentos de todos os usuários.' : 'Seus fechamentos anteriores.'}
      </p>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="centered-shell">
          <span className="spinner" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty-state card">Nenhum fechamento registrado ainda.</div>
      ) : (
        sessions.map((s) => (
          <Link
            key={s.id}
            to={`/historico/${s.id}`}
            className="card"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700, margin: '0 0 4px' }}>
                  {s.checklist_templates?.name ?? 'Checklist'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                  {isAdmin && s.profiles?.full_name ? `${s.profiles.full_name} · ` : ''}
                  {formatDate(s.started_at)}
                </p>
              </div>
              <span className={`badge ${STATUS_LABEL[s.status]?.className ?? 'badge-muted'}`}>
                {STATUS_LABEL[s.status]?.text ?? s.status}
              </span>
            </div>
          </Link>
        ))
      )}

      <nav className="list-nav">
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          Voltar
        </button>
      </nav>
    </main>
  )
}
