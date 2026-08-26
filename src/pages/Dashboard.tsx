import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import {
  BottomNav,
  CenteredLoader,
  FormError,
  PageMain,
  PageSubtitle,
  PageTitle
} from '../components/PageShell'
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
      <PageMain>
        <CenteredLoader />
      </PageMain>
    )
  }

  return (
    <PageMain>
      <PageTitle>Olá 👋</PageTitle>
      <PageSubtitle>Selecione um checklist para fechar o espaço.</PageSubtitle>

      {error && <FormError>{error}</FormError>}

      {activeSession && (
        <Card className="mb-4 ring-2 ring-brand-cyan">
          <CardContent>
            <Badge className="bg-warning-bg text-warning">Em andamento</Badge>
            <p className="mb-3.5 mt-1 font-semibold">Você tem um checklist não finalizado.</p>
            <Button className="w-full" onClick={() => navigate(`/sessao/${activeSession.id}`)}>
              Continuar checklist
            </Button>
          </CardContent>
        </Card>
      )}

      {templates.length === 0 ? (
        <Card>
          <CardContent className="items-center px-5 py-12 text-center text-muted-foreground">
            Nenhum checklist ativo foi configurado ainda. Peça ao responsável para cadastrar um em
            `checklist_templates`.
          </CardContent>
        </Card>
      ) : (
        templates.map((tpl) => (
          <Card key={tpl.id} className="mb-3">
            <CardContent className="gap-1">
              <CardTitle>{tpl.name}</CardTitle>
              {tpl.description && <CardDescription>{tpl.description}</CardDescription>}
              <Button
                className="mt-3 w-full"
                onClick={() => startSession(tpl.id)}
                disabled={!!activeSession || startingId === tpl.id}
              >
                {startingId === tpl.id ? <Spinner /> : 'Iniciar fechamento'}
              </Button>
            </CardContent>
          </Card>
        ))
      )}

      <BottomNav>
        <Button variant="outline" onClick={() => navigate('/historico')}>
          Ver histórico
        </Button>
      </BottomNav>
    </PageMain>
  )
}
