import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/Spinner'
import {
  APP_MAIN,
  BTN_PRIMARY_BLOCK,
  BTN_SECONDARY,
  CARD,
  CENTERED_SHELL,
  FORM_ERROR,
  LIST_NAV,
  PAGE_SUBTITLE,
  PAGE_TITLE
} from '../lib/ui'
import type { ChecklistTemplate, ClosingSession } from '../types'

interface ActiveSession extends ClosingSession {
  checklist_templates?: { name: string } | null
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startingId, setStartingId] = useState<string | null>(null)

  if (!user) {
    throw new Error('Dashboard requires an authenticated user')
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    const [{ data: templateData, error: templateError }, { data: sessionData, error: sessionError }] =
      await Promise.all([
        supabase
          .from('checklist_templates')
          .select('id, name, description')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('closing_sessions')
          .select('id, template_id, status, started_at, completed_at')
          .eq('user_id', user!.id)
          .eq('status', 'in_progress')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ])

    if (templateError || sessionError) {
      setError('Não foi possível carregar os dados. Verifique sua conexão.')
    } else {
      setTemplates(templateData ?? [])
      setActiveSession(sessionData ?? null)
    }
    setLoading(false)
  }

  async function startSession(templateId: string) {
    setStartingId(templateId)
    setError('')
    const { data, error: insertError } = await supabase
      .from('closing_sessions')
      .insert({ template_id: templateId, user_id: user!.id, status: 'in_progress' })
      .select('id')
      .single()

    setStartingId(null)
    if (insertError) {
      setError('Não foi possível iniciar o checklist. Tente novamente.')
      return
    }
    navigate(`/sessao/${data.id}`)
  }

  if (loading) {
    return (
      <main className={APP_MAIN}>
        <div className={CENTERED_SHELL}>
          <Spinner className="text-primary" />
        </div>
      </main>
    )
  }

  return (
    <main className={APP_MAIN}>
      <p className={PAGE_TITLE}>Olá 👋</p>
      <p className={PAGE_SUBTITLE}>Selecione um checklist para fechar o espaço.</p>

      {error && <div className={FORM_ERROR}>{error}</div>}

      {activeSession && (
        <div className={`${CARD} mb-4 border-2 border-accent`}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning">
            Em andamento
          </span>
          <p className="mb-3.5 mt-1 font-semibold">Você tem um checklist não finalizado.</p>
          <button className={BTN_PRIMARY_BLOCK} onClick={() => navigate(`/sessao/${activeSession.id}`)}>
            Continuar checklist
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className={`${CARD} px-5 py-12 text-center text-text-muted`}>
          Nenhum checklist ativo foi configurado ainda. Peça ao responsável para cadastrar um em
          `checklist_templates`.
        </div>
      ) : (
        templates.map((tpl) => (
          <div className={`${CARD} mb-3`} key={tpl.id}>
            <p className="m-0 mb-1 text-base font-bold">{tpl.name}</p>
            {tpl.description && (
              <p className="m-0 text-sm leading-normal text-text-muted">{tpl.description}</p>
            )}
            <button
              className={`${BTN_PRIMARY_BLOCK} mt-3`}
              onClick={() => startSession(tpl.id)}
              disabled={!!activeSession || startingId === tpl.id}
            >
              {startingId === tpl.id ? <Spinner /> : 'Iniciar fechamento'}
            </button>
          </div>
        ))
      )}

      <nav className={LIST_NAV}>
        <button className={BTN_SECONDARY} onClick={() => navigate('/historico')}>
          Ver histórico
        </button>
      </nav>
    </main>
  )
}
