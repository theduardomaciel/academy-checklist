import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, PHOTOS_BUCKET } from '../lib/supabaseClient'
import ItemCard from '../components/ItemCard'
import ProgressBar from '../components/ProgressBar'

export default function ChecklistSession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [items, setItems] = useState([])
  const [logsByItem, setLogsByItem] = useState({}) // item_id -> { status, photo_path, previewUrl, pendingFile }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingItemId, setSavingItemId] = useState(null)
  const [finishing, setFinishing] = useState(false)

  const loadSession = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data: sessionData, error: sessionError } = await supabase
      .from('closing_sessions')
      .select('id, template_id, status, started_at')
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionData) {
      setError('Checklist não encontrado.')
      setLoading(false)
      return
    }

    const [{ data: itemData, error: itemError }, { data: logData, error: logError }] =
      await Promise.all([
        supabase
          .from('checklist_items')
          .select('id, title, instructions, order_index, requires_photo')
          .eq('template_id', sessionData.template_id)
          .order('order_index'),
        supabase.from('closing_logs').select('*').eq('session_id', sessionId)
      ])

    if (itemError || logError) {
      setError('Não foi possível carregar os itens do checklist.')
      setLoading(false)
      return
    }

    const map = {}
    for (const log of logData ?? []) {
      map[log.item_id] = { status: log.status, photo_path: log.photo_path }
    }

    setSession(sessionData)
    setItems(itemData ?? [])
    setLogsByItem(map)
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const completedCount = useMemo(
    () => items.filter((i) => logsByItem[i.id]?.status === 'done' || logsByItem[i.id]?.status === 'skipped').length,
    [items, logsByItem]
  )

  function handlePhotoSelected(itemId, file) {
    const previewUrl = URL.createObjectURL(file)
    setLogsByItem((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], pendingFile: file, previewUrl }
    }))
  }

  async function markItemDone(item) {
    const entry = logsByItem[item.id]
    setSavingItemId(item.id)
    setError('')

    let photoPath = entry?.photo_path ?? null

    try {
      if (item.requires_photo && entry?.pendingFile) {
        const path = `${session.id}/${item.id}.jpg`
        const { error: uploadError } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, entry.pendingFile, { upsert: true, contentType: 'image/jpeg' })

        if (uploadError) throw uploadError
        photoPath = path
      }

      const { error: upsertError } = await supabase.from('closing_logs').upsert(
        {
          session_id: session.id,
          item_id: item.id,
          status: 'done',
          photo_path: photoPath,
          completed_at: new Date().toISOString()
        },
        { onConflict: 'session_id,item_id' }
      )

      if (upsertError) throw upsertError

      setLogsByItem((prev) => ({
        ...prev,
        [item.id]: { status: 'done', photo_path: photoPath, previewUrl: prev[item.id]?.previewUrl }
      }))
    } catch (err) {
      console.error(err)
      setError('Não foi possível salvar este item. Verifique sua conexão e tente novamente.')
    } finally {
      setSavingItemId(null)
    }
  }

  async function skipItem(item) {
    setSavingItemId(item.id)
    setError('')
    const { error: upsertError } = await supabase.from('closing_logs').upsert(
      {
        session_id: session.id,
        item_id: item.id,
        status: 'skipped',
        completed_at: new Date().toISOString()
      },
      { onConflict: 'session_id,item_id' }
    )
    setSavingItemId(null)
    if (upsertError) {
      setError('Não foi possível pular este item.')
      return
    }
    setLogsByItem((prev) => ({ ...prev, [item.id]: { status: 'skipped' } }))
  }

  async function finishSession() {
    setFinishing(true)
    setError('')
    const { error: updateError } = await supabase
      .from('closing_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', session.id)

    setFinishing(false)
    if (updateError) {
      setError('Não foi possível finalizar o checklist.')
      return
    }
    navigate(`/historico/${session.id}`)
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

  if (error && !session) {
    return (
      <main className="app-main">
        <div className="form-error">{error}</div>
      </main>
    )
  }

  const allDone = items.length > 0 && completedCount === items.length

  return (
    <main className="app-main">
      <p className="page-title">Checklist de fechamento</p>
      <p className="page-subtitle">
        Siga a ordem dos itens e registre uma foto para cada equipamento.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <ProgressBar completed={completedCount} total={items.length} />
      </div>

      {error && <div className="form-error">{error}</div>}

      {items.map((item, idx) => {
        const entry = logsByItem[item.id] ?? {}
        return (
          <ItemCard
            key={item.id}
            index={idx + 1}
            item={item}
            status={entry.status}
            photoUrl={entry.previewUrl}
            saving={savingItemId === item.id}
            onPhotoSelected={(file) => handlePhotoSelected(item.id, file)}
            onMarkDone={() => markItemDone(item)}
            onSkip={() => skipItem(item)}
          />
        )
      })}

      <div style={{ height: 90 }} />

      <nav className="list-nav">
        <button
          className="btn btn-primary btn-block"
          disabled={!allDone || finishing || session.status === 'completed'}
          onClick={finishSession}
        >
          {finishing ? (
            <span className="spinner" />
          ) : session.status === 'completed' ? (
            'Checklist já finalizado'
          ) : (
            'Finalizar fechamento'
          )}
        </button>
      </nav>
    </main>
  )
}
