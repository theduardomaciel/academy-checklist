import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/Spinner'
import {
  APP_MAIN,
  BTN_SECONDARY,
  CARD,
  CENTERED_SHELL,
  FORM_ERROR,
  LIST_NAV,
  PAGE_SUBTITLE,
  PAGE_TITLE
} from '../lib/ui'

interface HistoryRow {
  id: string
  status: 'in_progress' | 'completed'
  started_at: string
  completed_at: string | null
  checklist_templates: { name: string } | null
  profiles: { full_name: string | null } | null
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  completed: {
    text: 'Concluído',
    className: 'bg-success-bg text-success'
  },
  in_progress: {
    text: 'Em andamento',
    className: 'bg-warning-bg text-warning'
  }
}

const BADGE = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold'

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
    <main className={APP_MAIN}>
      <p className={PAGE_TITLE}>Histórico</p>
      <p className={PAGE_SUBTITLE}>
        {isAdmin ? 'Fechamentos de todos os usuários.' : 'Seus fechamentos anteriores.'}
      </p>

      {error && <div className={FORM_ERROR}>{error}</div>}

      {loading ? (
        <div className={CENTERED_SHELL}>
          <Spinner className="text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className={`${CARD} px-5 py-12 text-center text-text-muted`}>
          Nenhum fechamento registrado ainda.
        </div>
      ) : (
        sessions.map((s) => (
          <Link
            key={s.id}
            to={`/historico/${s.id}`}
            className={`${CARD} mb-3 block no-underline`}
            style={{ color: 'inherit' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="m-0 mb-1 font-bold">
                  {s.checklist_templates?.name ?? 'Checklist'}
                </p>
                <p className="m-0 text-[13px] text-text-muted">
                  {isAdmin && s.profiles?.full_name ? `${s.profiles.full_name} · ` : ''}
                  {formatDate(s.started_at)}
                </p>
              </div>
              <span className={`${BADGE} ${STATUS_LABEL[s.status]?.className ?? 'bg-border text-text-muted'}`}>
                {STATUS_LABEL[s.status]?.text ?? s.status}
              </span>
            </div>
          </Link>
        ))
      )}

      <nav className={LIST_NAV}>
        <button className={BTN_SECONDARY} onClick={() => navigate('/')}>
          Voltar
        </button>
      </nav>
    </main>
  )
}
