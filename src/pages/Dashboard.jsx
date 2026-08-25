import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startingId, setStartingId] = useState(null)

  useEffect(() => {
    loadData()
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
          .select('id, template_id, started_at')
          .eq('user_id', user.id)
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

  async function startSession(templateId) {
    setStartingId(templateId)
    setError('')
    const { data, error: insertError } = await supabase
      .from('closing_sessions')
      .insert({ template_id: templateId, user_id: user.id, status: 'in_progress' })
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
      <main className="app-main">
        <div className="centered-shell">
          <span className="spinner" style={{ color: 'var(--color-primary)' }} />
        </div>
      </main>
    )
  }

  return (
    <main className="app-main">
      <p className="page-title">Olá 👋</p>
      <p className="page-subtitle">Selecione um checklist para fechar o espaço.</p>

      {error && <div className="form-error">{error}</div>}

      {activeSession && (
        <div
          className="card"
          style={{ borderColor: 'var(--color-accent)', borderWidth: 2, marginBottom: 16 }}
        >
          <span className="badge badge-warning" style={{ marginBottom: 8 }}>
            Em andamento
          </span>
          <p style={{ margin: '4px 0 14px', fontWeight: 600 }}>
            Você tem um checklist não finalizado.
          </p>
          <button
            className="btn btn-primary btn-block"
            onClick={() => navigate(`/sessao/${activeSession.id}`)}
          >
            Continuar checklist
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="empty-state card">
          Nenhum checklist ativo foi configurado ainda. Peça ao responsável para cadastrar um em
          `checklist_templates`.
        </div>
      ) : (
        templates.map((tpl) => (
          <div className="card" key={tpl.id}>
            <p className="item-card__title">{tpl.name}</p>
            {tpl.description && <p className="item-card__instructions">{tpl.description}</p>}
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 12 }}
              onClick={() => startSession(tpl.id)}
              disabled={!!activeSession || startingId === tpl.id}
            >
              {startingId === tpl.id ? <span className="spinner" /> : 'Iniciar fechamento'}
            </button>
          </div>
        ))
      )}

      <nav className="list-nav">
        <button className="btn btn-secondary" onClick={() => navigate('/historico')}>
          Ver histórico
        </button>
      </nav>
    </main>
  )
}
